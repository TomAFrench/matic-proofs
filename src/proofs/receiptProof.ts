import { JsonRpcProvider, TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { arrayify } from "@ethersproject/bytes";
import { encode } from "@ethersproject/rlp";
import { BigNumber } from "@ethersproject/bignumber";
import { ReceiptMPProof, ReceiptProof } from "../types";
import { getFullBlockByHash } from "../utils/blocks";
import { hexToBuffer } from "../utils/buffer";

export const getReceiptBytes = (receipt: TransactionReceipt): Buffer => {
  return hexToBuffer(
    encode([
      // eslint-disable-next-line no-nested-ternary
      receipt.status ? "0x01" : "0x00",
      arrayify(BigNumber.from(receipt.cumulativeGasUsed)),
      receipt.logsBloom,

      // encoded log array
      receipt.logs.map(l => {
        // [address, [topics array], data]
        return [
          l.address, // convert address to buffer
          l.topics, // convert topics to buffer
          l.data, // convert data to buffer
        ];
      }),
    ]),
  );
};

const buildReceiptTrie = async (receipts: TransactionReceipt[]) => {
  const receiptsTrie = new BaseTrie();
  // Add all receipts to the trie
  for (let i = 0; i < receipts.length; i += 1) {
    const siblingReceipt = receipts[i];
    const path = hexToBuffer(encode(arrayify(siblingReceipt.transactionIndex)));
    const rawReceipt = getReceiptBytes(siblingReceipt);
    // eslint-disable-next-line no-await-in-loop
    await receiptsTrie.put(path, rawReceipt);
  }
  return receiptsTrie;
};

export const buildMerklePatriciaProof = async (
  receipt: TransactionReceipt,
  receipts: TransactionReceipt[],
): Promise<ReceiptMPProof> => {
  const receiptsTrie = await buildReceiptTrie(receipts);
  const key = hexToBuffer(encode(arrayify(receipt.transactionIndex)));
  const { node, remaining, stack } = await receiptsTrie.findPath(key);

  if (node === null || remaining.length > 0) {
    throw new Error("Node does not contain the key");
  }

  return {
    parentNodes: stack.map(stackElem => stackElem.serialize()),
    root: receiptsTrie.root,
    path: Buffer.concat([Buffer.from("00", "hex"), key]),
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
