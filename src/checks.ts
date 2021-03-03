import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";

import { hexConcat } from "@ethersproject/bytes";
import { buildMerklePatriciaProof } from "./proofs/receiptProof";
import { getFullBlockByHash } from "./utils/blocks";
import { getLogIndex } from "./utils/logIndex";
import { RequiredBlockMembers } from "./types";
import { getCheckpointManager, getRootChainManager, getStateReceiver } from "./utils/contracts";
import { hexToBuffer } from "./utils/buffer";
import { EventSignature } from "./constants";

export const calculateExitHash = async (
  maticChainProvider: JsonRpcProvider,
  burnTxHash: string,
  logEventSig: EventSignature,
  selectedBurn = 0,
): Promise<string> => {
  const burnTxReceipt = await maticChainProvider.getTransactionReceipt(burnTxHash);
  if (typeof burnTxReceipt.blockNumber === "undefined") {
    throw new Error("Could not find find blocknumber of burn transaction");
  }

  const burnTxBlock: RequiredBlockMembers = await getFullBlockByHash(maticChainProvider, burnTxReceipt.blockHash);
  const receipts = await Promise.all(burnTxBlock.transactions.map(tx => maticChainProvider.getTransactionReceipt(tx)));
  const { path } = await buildMerklePatriciaProof(burnTxReceipt, receipts, burnTxBlock.number, burnTxBlock.hash);

  const nibbleArray: string[] = [];
  // RootChain.sol drops first byte (2 nibbles) from nibble array when calculating nibbleArray
  hexToBuffer(path)
    .slice(1)
    .forEach(byte => {
      nibbleArray.push("0x0" + Math.floor(byte / 0x10).toString(16));
      nibbleArray.push("0x0" + (byte % 0x10).toString(16));
    });
  const nibblesHex = hexConcat(nibbleArray);

  const logIndex = getLogIndex(burnTxReceipt, logEventSig, selectedBurn);
  const exitHash = solidityKeccak256(
    ["uint256", "bytes", "uint256"],
    [burnTxReceipt.blockNumber, nibblesHex, logIndex],
  );

  return exitHash;
};

/**
 * Check whether a message has already been processed on root chain
 * @param rootChainProvider - a Provider for the root chain (Ethereum)
 * @param maticChainProvider - a JSONRpcProvider for the child chain (Matic)
 * @param rootChainContractAddress - The address of the rootChainManager contract
 * @param burnTxHash - The hash of the transaction of interest on the child chain
 * @param logEventSig - The event signature for the log to check for
 */
export const isBurnTxProcessed = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  exitProcessorAddress: string,
  burnTxHash: string,
  logEventSig: EventSignature,
): Promise<boolean> => {
  const exitHash = await calculateExitHash(maticChainProvider, burnTxHash, logEventSig);
  // We do a slight cheat here as the exitProcessor may not be a rootChainManager
  // However we only need the processedExits function which the rootChainManager ABI has.
  const exitProcessorContract = getRootChainManager(rootChainProvider, exitProcessorAddress);
  return exitProcessorContract.processedExits(exitHash);
};

/**
 * Check whether a particular block on Matic has been checkpointed on the root chain
 * @param rootChainProvider - a Provider for the root chain (Ethereum)
 * @param rootChainContractAddress - The address of the rootChainManager contract
 * @param blockNumber - The block number which we want to know the checkpoint status of
 */
export const isBlockCheckpointed = async (
  rootChainProvider: Provider,
  rootChainContractAddress: string,
  blockNumber: BigNumberish,
): Promise<boolean> => {
  const checkpointManagerContract = await getCheckpointManager(rootChainProvider, rootChainContractAddress);
  const lastChildBlock = await checkpointManagerContract.getLastChildBlock();

  return BigNumber.from(lastChildBlock).gte(blockNumber);
};

/**
 * Check whether a particular transaction has been checkpointed on the root chain
 * @param rootChainProvider - a Provider for the root chain (Ethereum)
 * @param maticChainProvider - a JSONRpcProvider for the child chain (Matic)
 * @param rootChainContractAddress - The address of the rootChainManager contract
 * @param burnTxHash - The hash of the transaction of interest on the child chain
 */
export const isBurnTxCheckpointed = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  burnTxHash: string,
): Promise<boolean> => {
  const burnTx = await maticChainProvider.getTransaction(burnTxHash);
  if (typeof burnTx === null) {
    throw new Error("Could not find transaction corresponding to burnTxHash");
  } else if (typeof burnTx.blockNumber === "undefined") {
    throw new Error("Could not find blocknumber of burnTx");
  }

  return isBlockCheckpointed(rootChainProvider, rootChainContractAddress, burnTx.blockNumber);
};

/**
 * Check whether an event log from a given transaction has been processed on the root chain
 * @param rootChainProvider - a Provider for the root chain (Ethereum)
 * @param maticChainProvider - a JSONRpcProvider for the child chain (Matic)
 * @param rootChainContractAddress - The address of the rootChainManager contract
 * @param burnTxHash - The hash of the transaction of interest on the child chain
 * @param logEventSig - The event signature for the log to check for
 * @param exitProcessorAddress - The address of the contract which tracks whether this exit has been processed
 */
export const isBurnTxClaimable = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  burnTxHash: string,
  logEventSig: EventSignature,
  exitProcessorAddress: string = rootChainContractAddress,
): Promise<boolean> => {
  const alreadyClaimed = await isBurnTxProcessed(
    rootChainProvider,
    maticChainProvider,
    exitProcessorAddress,
    burnTxHash,
    logEventSig,
  );
  const checkpointed = await isBurnTxCheckpointed(
    rootChainProvider,
    maticChainProvider,
    rootChainContractAddress,
    burnTxHash,
  );

  // Withdrawal can be claimed if it is checkpointed and hasn't already been claimed
  return checkpointed && !alreadyClaimed;
};

/**
 * Check whether a root chain transaction which has sent state to the child chain has been synced.
 * @param rootChainProvider - a Provider for the root chain (Ethereum)
 * @param maticChainProvider - a Provider for the child chain (Matic)
 * @param txHash - The hash of the transaction of interest on the child chain
 */
export const isRootTxStateSynced = async (
  rootChainProvider: Provider,
  maticChainProvider: Provider,
  txHash: string,
): Promise<boolean> => {
  const txReceipt = await rootChainProvider.getTransactionReceipt(txHash);
  const stateReceiver = getStateReceiver(maticChainProvider);
  const childCounter = await stateReceiver.lastStateId();

  const STATE_SYNCED_LOG = "0x103fed9db65eac19c4d870f49ab7520fe03b99f1838e5996caf47e9e43308392";
  const stateSyncedLog = txReceipt.logs.find(log => log.topics[0] === STATE_SYNCED_LOG);
  if (stateSyncedLog === undefined) return false;
  const rootCounter = stateSyncedLog.topics[1];
  return BigNumber.from(childCounter).gte(rootCounter);
};
