import { JsonRpcProvider, TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { rlp, toBuffer } from "ethereumjs-util";
import { BigNumber } from "@ethersproject/bignumber";
import { ReceiptMPProof, ReceiptProof } from "../types";
import { getFullBlockByHash } from "../utils/blocks";

export const getReceiptBytes = (receipt: TransactionReceipt): Buffer => {
  return rlp.encode([
    toBuffer(
      // eslint-disable-next-line no-nested-ternary
      receipt.status !== undefined && receipt.status != null ? (receipt.status ? "0x1" : "0x") : receipt.root,
    ),
    toBuffer(BigNumber.from(receipt.cumulativeGasUsed).toHexString()),
    toBuffer(receipt.logsBloom),

    // encoded log array
    receipt.logs.map(l => {
      // [address, [topics array], data]
      return [
        toBuffer(l.address), // convert address to buffer
        l.topics.map(toBuffer), // convert topics to buffer
        toBuffer(l.data), // convert data to buffer
      ];
    }),
  ]);
};

const buildReceiptTrie = async (receipts: TransactionReceipt[]) => {
  const receiptsTrie = new BaseTrie();
  // Add all receipts to the trie
  for (let i = 0; i < receipts.length; i += 1) {
    const siblingReceipt = receipts[i];
    const path = rlp.encode(siblingReceipt.transactionIndex);
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
  const { node, remaining, stack } = await receiptsTrie.findPath(rlp.encode(receipt.transactionIndex));

  if (node === null || remaining.length > 0) {
    throw new Error("Node does not contain the key");
  }

  return {
    parentNodes: stack.map(stackElem => stackElem.serialize()),
    root: receiptsTrie.root,
    path: Buffer.concat([Buffer.from("00", "hex"), rlp.encode(receipt.transactionIndex)]),
    value: rlp.decode(node.value),
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
    receiptsRoot: Buffer.from(burnTxBlock.receiptsRoot.slice(2), "hex"),
  };
};
