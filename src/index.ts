import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { hexConcat } from "@ethersproject/bytes";
import { bufferToHex, rlp } from "ethereumjs-util";
import { ExitProof } from "./types";
import { buildBlockProof } from "./proofs/blockProof";
import { buildReceiptProof, getReceiptBytes } from "./proofs/receiptProof";
import { getLogIndex } from "./utils/logIndex";
import { hexToBuffer } from "./utils/buffer";
import { EventSignature } from "./constants";

export { buildBlockProof } from "./proofs/blockProof";
export { buildReceiptProof, getReceiptBytes } from "./proofs/receiptProof";
export {
  isBlockCheckpointed,
  isBurnTxCheckpointed,
  isBurnTxProcessed,
  isBurnTxClaimable,
  isRootTxStateSynced,
} from "./checks";
export * from "./constants";

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
  logEventSig: EventSignature,
  selectedBurn = 0,
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

  const logIndex = getLogIndex(burnTxReceipt, logEventSig, selectedBurn);

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
