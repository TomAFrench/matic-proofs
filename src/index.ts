import { Contract } from "@ethersproject/contracts";
import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

import { bufferToHex, keccak256, rlp } from "ethereumjs-util";
import checkpointManagerABI from "./abi/ICheckpointManager.json";
import rootChainABI from "./abi/RootChainManager.json";

import { ExitProof, RequiredBlockMembers } from "./types";
import { buildBlockProof } from "./proofs/blockProof";
import { getReceiptBytes, getReceiptProof } from "./proofs/receiptProof";
import { findHeaderBlockNumber, getFullBlockByHash } from "./utils/blocks";

export { getReceiptProof } from "./proofs/receiptProof";

export const encodePayload = ({
  headerBlockNumber,
  blockProof,
  burnTxBlockNumber,
  burnTxBlockTimestamp,
  transactionsRoot,
  receiptsRoot,
  receipt,
  receiptProofParentNodes,
  receiptProofPath,
  logIndex,
}: ExitProof): string =>
  bufferToHex(
    rlp.encode([
      headerBlockNumber,
      bufferToHex(Buffer.concat(blockProof)),
      burnTxBlockNumber,
      burnTxBlockTimestamp,
      bufferToHex(transactionsRoot),
      bufferToHex(receiptsRoot),
      bufferToHex(receipt),
      bufferToHex(rlp.encode(receiptProofParentNodes)),
      bufferToHex(receiptProofPath),
      logIndex,
    ]),
  );

export const isBurnTxProcessed = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  burnTxHash: string,
  logEventSig: string,
): Promise<boolean> => {
  const rootChainContract = new Contract(rootChainContractAddress, rootChainABI, rootChainProvider);

  const burnTxReceipt = await maticChainProvider.getTransactionReceipt(burnTxHash);
  if (typeof burnTxReceipt.blockNumber === "undefined") {
    throw new Error("Could not find find blocknumber of burn transaction");
  }

  const logIndex = burnTxReceipt.logs.findIndex(log => log.topics[0].toLowerCase() === logEventSig.toLowerCase());
  if (logIndex === -1) {
    throw new Error("Log not found in receipt");
  }

  const burnTxBlock: RequiredBlockMembers = await getFullBlockByHash(maticChainProvider, burnTxReceipt.blockHash);
  const receiptProof = await getReceiptProof(maticChainProvider, burnTxReceipt, burnTxBlock);

  const exitHash = keccak256(Buffer.from([burnTxReceipt.blockNumber, receiptProof.parentNodes, logIndex]));
  return rootChainContract.processedExits(exitHash);
};

export const isBurnTxCheckPointed = async (
  rootChainProvider: Provider,
  rootChainContractAddress: string,
  burnTxBlockNumber: BigNumberish,
): Promise<boolean> => {
  const rootChainContract = new Contract(rootChainContractAddress, rootChainABI, rootChainProvider);
  const checkpointManagerAddress = await rootChainContract.checkpointManagerAddress();
  const checkpointManagerContract = new Contract(checkpointManagerAddress, checkpointManagerABI, rootChainProvider);
  const lastChildBlock = await checkpointManagerContract.getLastChildBlock();

  return BigNumber.from(lastChildBlock).gte(burnTxBlockNumber);
};

export const buildPayloadForExit = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  burnTxHash: string,
  logEventSig: string,
): Promise<ExitProof> => {
  // Check that we can actually confirm that the burn transaction exists
  const burnTx = await maticChainProvider.getTransaction(burnTxHash);
  if (typeof burnTx.blockNumber === "undefined") {
    throw new Error("Could not find find blocknumber of burnTx");
  } else if (typeof burnTx.blockHash === "undefined") {
    throw new Error("Could not find find blockHash of burnTx");
  }

  // Check that the block containing the burn transaction is checkpointed on mainnet.
  const rootChainContract = new Contract(rootChainContractAddress, rootChainABI, rootChainProvider);
  if (!isBurnTxCheckPointed(rootChainProvider, rootChainContractAddress, burnTx.blockNumber)) {
    throw new Error("Burn transaction has not been checkpointed as yet");
  }

  const checkpointManagerAddress = await rootChainContract.checkpointManagerAddress();
  const checkpointManagerContract = new Contract(checkpointManagerAddress, checkpointManagerABI, rootChainProvider);

  // Build proof that block containing burnTx is included in Matic chain.
  // Proves that a block with the stated blocknumber has been included in a checkpoint
  const headerBlockNumber = await findHeaderBlockNumber(checkpointManagerContract, burnTx.blockNumber);
  const headerBlock = await checkpointManagerContract.headerBlocks(headerBlockNumber.toString());

  const blockProof = await buildBlockProof(
    maticChainProvider,
    BigNumber.from(headerBlock.start).toNumber(),
    BigNumber.from(headerBlock.end).toNumber(),
    burnTx.blockNumber,
  );

  // Build proof that the burn transaction is included in this block.
  const burnTxBlock: RequiredBlockMembers = await getFullBlockByHash(maticChainProvider, burnTx.blockHash);
  const receipt = await maticChainProvider.getTransactionReceipt(burnTxHash);

  const logIndex = receipt.logs.findIndex(log => log.topics[0].toLowerCase() === logEventSig.toLowerCase());
  if (logIndex === -1) {
    throw new Error("Log not found in receipt");
  }

  const receiptProof = await getReceiptProof(maticChainProvider, receipt, burnTxBlock);

  return {
    headerBlockNumber: headerBlockNumber.toNumber(),
    blockProof,
    burnTxBlockNumber: BigNumber.from(burnTx.blockNumber).toNumber(),
    burnTxBlockTimestamp: BigNumber.from(burnTxBlock.timestamp).toNumber(),
    transactionsRoot: Buffer.from(burnTxBlock.transactionsRoot.slice(2), "hex"),
    receiptsRoot: Buffer.from(burnTxBlock.receiptsRoot.slice(2), "hex"),
    receipt: getReceiptBytes(receipt), // rlp encoded
    receiptProofParentNodes: receiptProof.parentNodes,
    receiptProofPath: receiptProof.path,
    logIndex,
  };
};
