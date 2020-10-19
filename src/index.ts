import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";

import { bufferToHex, rlp } from "ethereumjs-util";

import { ExitProof, RequiredBlockMembers } from "./types";
import { buildBlockProof } from "./proofs/blockProof";
import { getReceiptBytes, getReceiptProof } from "./proofs/receiptProof";
import { getFullBlockByHash } from "./utils/blocks";
import { findBlockCheckpoint } from "./utils/checkpoint";
import { getLogIndex } from "./utils/logIndex";
import { isBlockCheckpointed } from "./checks";

export { isBlockCheckpointed, isBurnTxCheckpointed, isBurnTxProcessed, isBurnTxClaimable } from "./checks";
export { getReceiptProof } from "./proofs/receiptProof";

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

export const buildPayloadForExit = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  burnTxHash: string,
  logEventSig: string,
): Promise<ExitProof> => {
  // Check that we can actually confirm that the burn transaction exists
  const burnTx = await maticChainProvider.getTransaction(burnTxHash);
  if (typeof burnTx === null) {
    throw new Error("Could not find transaction corresponding to burnTxHash");
  } else if (typeof burnTx.blockNumber === "undefined") {
    throw new Error("Could not find blocknumber of burnTx");
  } else if (typeof burnTx.blockHash === "undefined") {
    throw new Error("Could not find blockHash of burnTx");
  }

  // Check that the block containing the burn transaction is checkpointed on mainnet.
  if (!isBlockCheckpointed(rootChainProvider, rootChainContractAddress, burnTx.blockNumber)) {
    throw new Error("Burn transaction has not been checkpointed yet");
  }

  const [checkpointId, checkpoint] = await findBlockCheckpoint(
    rootChainProvider,
    rootChainContractAddress,
    burnTx.blockNumber,
  );

  // Build proof that block containing burnTx is included in Matic chain.
  // Proves that a block with the stated blocknumber has been included in a checkpoint
  const blockProof = await buildBlockProof(
    maticChainProvider,
    BigNumber.from(checkpoint.start).toNumber(),
    BigNumber.from(checkpoint.end).toNumber(),
    burnTx.blockNumber,
  );

  // Build proof that the burn transaction is included in this block.
  const burnTxBlock: RequiredBlockMembers = await getFullBlockByHash(maticChainProvider, burnTx.blockHash);
  const receipt = await maticChainProvider.getTransactionReceipt(burnTxHash);

  const logIndex = getLogIndex(receipt, logEventSig);

  const receiptProof = await getReceiptProof(maticChainProvider, receipt, burnTxBlock);

  return {
    headerBlockNumber: checkpointId.toNumber(),
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
