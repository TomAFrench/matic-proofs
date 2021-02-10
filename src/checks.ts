import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";

import { hexConcat } from "@ethersproject/bytes";
import { buildMerklePatriciaProof } from "./proofs/receiptProof";
import { getFullBlockByHash } from "./utils/blocks";
import { getLogIndex } from "./utils/logIndex";
import { RequiredBlockMembers } from "./types";
import { getCheckpointManager, getRootChainManager } from "./utils/contracts";
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

export const isBlockCheckpointed = async (
  rootChainProvider: Provider,
  rootChainContractAddress: string,
  blockNumber: BigNumberish,
): Promise<boolean> => {
  const checkpointManagerContract = await getCheckpointManager(rootChainProvider, rootChainContractAddress);
  const lastChildBlock = await checkpointManagerContract.getLastChildBlock();

  return BigNumber.from(lastChildBlock).gte(blockNumber);
};

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
