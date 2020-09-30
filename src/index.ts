import { Contract } from "@ethersproject/contracts";
import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

import { bufferToHex, rlp } from "ethereumjs-util";
import checkpointManagerABI from "./abi/ICheckpointManager.json";
import rootChainABI from "./abi/RootChainManager.json";

import { ExitProof, RequiredBlockMembers } from "./types";
import { buildBlockProof } from "./proofs/blockProof";
import { getReceiptBytes, getReceiptProof } from "./proofs/receiptProof";
import { findHeaderBlockNumber, getFullBlockByHash } from "./utils/blocks";

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
      blockProof,
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

const isBurnTxCheckPointed = async (
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
  console.log("Got header blockNumber", headerBlockNumber);

  const headerBlock = await checkpointManagerContract.headerBlocks(headerBlockNumber);
  console.log("Got header block", headerBlock);

  const blockProof = await buildBlockProof(
    maticChainProvider,
    parseInt(headerBlock.start, 10),
    parseInt(headerBlock.end, 10),
    burnTx.blockNumber,
  );
  console.log("Built block proof");

  // Build proof that the burn transaction is included in this block.
  const burnTxBlock: RequiredBlockMembers = await getFullBlockByHash(maticChainProvider, burnTx.blockHash);
  const receipt = await maticChainProvider.getTransactionReceipt(burnTxHash);

  const logIndex = receipt.logs.findIndex(log => log.topics[0].toLowerCase() === logEventSig.toLowerCase());
  if (logIndex === -1) {
    throw new Error("Log not found in receipt");
  }

  const receiptProof = await getReceiptProof(maticChainProvider, receipt, burnTxBlock);

  return {
    headerBlockNumber: headerBlockNumber.toHexString(),
    blockProof,
    burnTxBlockNumber: BigNumber.from(burnTx.blockNumber).toHexString(),
    burnTxBlockTimestamp: burnTxBlock.timestamp,
    transactionsRoot: Buffer.from(burnTxBlock.transactionsRoot.slice(2), "hex"),
    receiptsRoot: Buffer.from(burnTxBlock.receiptsRoot.slice(2), "hex"),
    receipt: getReceiptBytes(receipt), // rlp encoded
    receiptProofParentNodes: receiptProof.parentNodes,
    receiptProofPath: receiptProof.path,
    logIndex,
  };
};
