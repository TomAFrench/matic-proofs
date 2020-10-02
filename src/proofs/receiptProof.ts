import { Provider, TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { rlp, toBuffer } from "ethereumjs-util";
import blockHeaderFromRpc from "ethereumjs-block/header-from-rpc";
import { ReceiptProof, RequiredBlockMembers } from "../types";

export const getReceiptBytes = (receipt: TransactionReceipt): Buffer => {
  return rlp.encode([
    toBuffer(
      // eslint-disable-next-line no-nested-ternary
      receipt.status !== undefined && receipt.status != null ? (receipt.status ? "0x1" : "0x") : receipt.root,
    ),
    toBuffer(receipt.cumulativeGasUsed.toHexString()),
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

export const getReceiptProof = async (
  provider: Provider,
  receipt: TransactionReceipt,
  block: RequiredBlockMembers,
  receipts: TransactionReceipt[] = [],
): Promise<ReceiptProof> => {
  const receiptsTrie = new BaseTrie();
  if (!receipts || receipts.length === 0) {
    // eslint-disable-next-line no-param-reassign
    receipts = await Promise.all(block.transactions.map(tx => provider.getTransactionReceipt(tx)));
  }

  // Add all receipts to the trie
  for (let i = 0; i < receipts.length; i += 1) {
    const siblingReceipt = receipts[i];
    const path = rlp.encode(siblingReceipt.transactionIndex);
    const rawReceipt = getReceiptBytes(siblingReceipt);
    // eslint-disable-next-line no-await-in-loop
    await receiptsTrie.put(path, rawReceipt);
  }

  const { node, remaining, stack } = await receiptsTrie.findPath(rlp.encode(receipt.transactionIndex));

  if (node === null || remaining.length > 0) {
    throw new Error("Node does not contain the key");
  }

  return {
    blockHash: toBuffer(receipt.blockHash),
    parentNodes: (stack.map(trieNode => trieNode.raw()) as unknown) as Buffer[],
    root: blockHeaderFromRpc(block).receiptTrie,
    path: Buffer.concat([Buffer.from("00", "hex"), rlp.encode(receipt.transactionIndex)]),
    value: rlp.decode(node.value),
  };
};
