import { JsonRpcProvider, TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { hexConcat, hexlify } from "@ethersproject/bytes";
import { encode } from "@ethersproject/rlp";
import { bufferToHex } from "ethereumjs-util";
import { ReceiptMPProof, ReceiptProof } from "../types";
import { getFullBlockByHash } from "../utils/blocks";
import { hexToBuffer } from "../utils/buffer";

export const getReceiptBytes = (receipt: TransactionReceipt): string => {
  return encode([
    receipt.status ? "0x01" : "0x00",
    hexlify(receipt.cumulativeGasUsed),
    receipt.logsBloom,

    // encoded log array
    receipt.logs.map(l => {
      // [address, [topics array], data]
      return [l.address, l.topics, l.data];
    }),
  ]);
};

const buildReceiptTrie = async (receipts: TransactionReceipt[]) => {
  const receiptsTrie = new BaseTrie();
  // Add all receipts to the trie
  for (let i = 0; i < receipts.length; i += 1) {
    const siblingReceipt = receipts[i];
    const key = encode(hexlify(siblingReceipt.transactionIndex));
    const rawReceipt = getReceiptBytes(siblingReceipt);
    // console.log(rawReceipt);
    // eslint-disable-next-line no-await-in-loop
    await receiptsTrie.put(hexToBuffer(key), hexToBuffer(rawReceipt));
  }
  return receiptsTrie;
};

export const buildMerklePatriciaProof = async (
  receipt: TransactionReceipt,
  receipts: TransactionReceipt[],
): Promise<ReceiptMPProof> => {
  const receiptsTrie = await buildReceiptTrie(receipts);
  const key = encode(hexlify(receipt.transactionIndex));
  const { node, remaining, stack } = await receiptsTrie.findPath(hexToBuffer(key));

  if (node === null || remaining.length > 0) {
    throw new Error("Node does not contain the key");
  }
  // console.log("stack", stack);

  return {
    parentNodes: stack.map(stackElem => bufferToHex(stackElem.serialize())),
    root: bufferToHex(receiptsTrie.root),
    path: hexConcat(["0x00", hexlify(receipt.transactionIndex)]),
  };
};

export const buildReceiptProof = async (
  maticChainProvider: JsonRpcProvider,
  burnTxHash: string,
): Promise<ReceiptProof> => {
  const receipt = await maticChainProvider.getTransactionReceipt(burnTxHash);
  const burnTxBlock = await getFullBlockByHash(maticChainProvider, receipt.blockHash);
  const receipts = await Promise.all(burnTxBlock.transactions.map(tx => maticChainProvider.getTransactionReceipt(tx)));

  // Build proof that the burn transaction is included in this block.
  const receiptProof = await buildMerklePatriciaProof(receipt, receipts);
  return {
    receipt,
    receiptProof,
    receiptsRoot: burnTxBlock.receiptsRoot,
  };
};
