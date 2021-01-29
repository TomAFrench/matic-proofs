import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { hexConcat } from "@ethersproject/bytes";
import { bufferToHex, rlp } from "ethereumjs-util";
import { ExitProof } from "./types";
import { buildBlockProof } from "./proofs/blockProof";
import { buildReceiptProof, getReceiptBytes } from "./proofs/receiptProof";
import { getLogIndex } from "./utils/logIndex";
import { hexToBuffer } from "./utils/buffer";

export { buildBlockProof } from "./proofs/blockProof";
export { buildReceiptProof, getReceiptBytes } from "./proofs/receiptProof";
export { isBlockCheckpointed, isBurnTxCheckpointed, isBurnTxProcessed, isBurnTxClaimable } from "./checks";

export const ERC20_TRANSFER_EVENT_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const ERC721_TRANSFER_EVENT_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export const ERC1155_TRANSFER_SINGLE_EVENT_SIG = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";
export const ERC1155_TRANSFER_BATCH_EVENT_SIG = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb";

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
}: ExitProof): string => {
  return bufferToHex(
    rlp.encode([
      headerBlockNumber,
      hexConcat(blockProof),
      burnTxBlockNumber,
      burnTxBlockTimestamp,
      transactionsRoot,
      receiptsRoot,
      getReceiptBytes(receipt),
      // Each node in proof has been RLP encoded when serialised
      // so we need to decode each individually and reencode the proof as a whole
      rlp.encode(receiptProofParentNodes.map(node => rlp.decode(hexToBuffer(node)))),
      receiptProofPath,
      logIndex,
    ]),
  );
};

export const buildPayloadForExit = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  burnTxHash: string,
  logEventSigOrIndex: string | number,
): Promise<ExitProof> => {
  // Check that we can actually confirm that the burn transaction exists
  const burnTxReceipt = await maticChainProvider.getTransactionReceipt(burnTxHash);
  if (typeof burnTxReceipt === null) {
    throw new Error("Could not find transaction corresponding to burnTxHash");
  } else if (typeof burnTxReceipt.blockNumber === "undefined") {
    throw new Error("Could not find blocknumber of burnTx");
  } else if (typeof burnTxReceipt.blockHash === "undefined") {
    throw new Error("Could not find blockHash of burnTx");
  }

  // If user has provided a string, find index of the first matching withdraw event in the receipt.
  // If user has provided a number, take this as the index of the desired withdrawal event.
  // This is necessary as a transaction can have multiple withdrawals.
  const logIndex =
    typeof logEventSigOrIndex === "string" ? getLogIndex(burnTxReceipt, logEventSigOrIndex) : logEventSigOrIndex;

  // Build proof that the burn transaction is included in this block.
  const { receipt, parentNodes, path } = await buildReceiptProof(maticChainProvider, burnTxHash);

  // Build proof that block containing burnTx is included in Matic chain.
  // Proves that a block with the stated blocknumber has been included in a checkpoint
  const {
    burnTxBlockNumber,
    burnTxBlockTimestamp,
    transactionsRoot,
    receiptsRoot,
    headerBlockNumber,
    blockProof,
  } = await buildBlockProof(rootChainProvider, maticChainProvider, rootChainContractAddress, burnTxReceipt.blockNumber);

  return {
    headerBlockNumber,
    blockProof,
    burnTxBlockNumber,
    burnTxBlockTimestamp,
    transactionsRoot,
    receiptsRoot,
    receipt,
    receiptProofParentNodes: parentNodes,
    receiptProofPath: path,
    logIndex,
  };
};
