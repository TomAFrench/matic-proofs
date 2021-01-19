import { JsonRpcProvider, Provider, TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { rlp, toBuffer } from "ethereumjs-util";
import blockHeaderFromRpc from "ethereumjs-block/header-from-rpc";
import { BigNumber } from "@ethersproject/bignumber";
import { ReceiptMPProof, ReceiptProof, RequiredBlockMembers } from "../types";
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

export const receiptMerklePatriciaProof = async (
  provider: Provider,
  receipt: TransactionReceipt,
  block: RequiredBlockMembers,
): Promise<ReceiptMPProof> => {
  const receipts = await Promise.all(block.transactions.map(tx => provider.getTransactionReceipt(tx)));
  const receiptsTrie = await buildReceiptTrie(receipts);
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

export const buildReceiptProof = async (
  maticChainProvider: JsonRpcProvider,
  burnTxHash: string,
): Promise<ReceiptProof> => {
  const receipt = await maticChainProvider.getTransactionReceipt(burnTxHash);
  const burnTxBlock = await getFullBlockByHash(maticChainProvider, receipt.blockHash);
  // Build proof that the burn transaction is included in this block.
  const receiptProof = await receiptMerklePatriciaProof(maticChainProvider, receipt, burnTxBlock);

  return {
    receipt,
    receiptProof,
    receiptsRoot: Buffer.from(burnTxBlock.receiptsRoot.slice(2), "hex"),
  };
};
