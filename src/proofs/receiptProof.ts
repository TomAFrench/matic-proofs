import { JsonRpcProvider, TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { hexConcat, hexlify, hexZeroPad } from "@ethersproject/bytes";
import { encode } from "@ethersproject/rlp";
import { bufferToHex, rlp } from "ethereumjs-util";
import { keccak256 } from "@ethersproject/solidity";
import { BigNumber } from "@ethersproject/bignumber";
import { MerklePatriciaProof, ReceiptProof } from "../types";
import { getFullBlockByHash } from "../utils/blocks";
import { hexToBuffer } from "../utils/buffer";

// getStateSyncTxHash returns block's tx hash for state-sync receipt
// Bor blockchain includes extra receipt/tx for state-sync logs,
// but it is not included in transactionRoot or receiptRoot.
// So, while calculating proof, we have to exclude them.
//
// This is derived from block's hash and number
// state-sync tx hash = keccak256("matic-bor-receipt-" + block.number + block.hash)
const getStateSyncTxHash = (blockNumber: string, blockHash: string): string =>
  keccak256(
    ["string", "bytes8", "bytes32"],
    [
      "matic-bor-receipt-",
      hexZeroPad(BigNumber.from(blockNumber).toHexString(), 8), // 8 bytes of block number (BigEndian)
      blockHash,
    ],
  );

export const getReceiptBytes = (receipt: TransactionReceipt): string => {
  return encode([
    // eslint-disable-next-line no-nested-ternary
    receipt.status !== undefined && receipt.status !== null ? (receipt.status ? "0x01" : "0x") : receipt.root,
    hexlify(receipt.cumulativeGasUsed),
    receipt.logsBloom,

    // encoded log array
    receipt.logs.map(l => {
      // [address, [topics array], data]
      return [l.address, l.topics, l.data];
    }),
  ]);
};

const buildReceiptTrie = async (receipts: TransactionReceipt[], blockNumber: string, blockHash: string) => {
  const receiptsTrie = new BaseTrie();
  const stateSyncHash = getStateSyncTxHash(blockNumber, blockHash);

  // Add all receipts to the trie
  for (let i = 0; i < receipts.length; i += 1) {
    const receipt = receipts[i];
    // Ignore any state sync receipts as they do not get included in trie
    if (receipt.transactionHash !== stateSyncHash) {
      const key = rlp.encode(receipt.transactionIndex);
      const rawReceipt = getReceiptBytes(receipt);
      // eslint-disable-next-line no-await-in-loop
      await receiptsTrie.put(key, hexToBuffer(rawReceipt));
    }
  }
  return receiptsTrie;
};

export const buildMerklePatriciaProof = async (
  receipt: TransactionReceipt,
  receipts: TransactionReceipt[],
  blockNumber: string,
  blockHash: string,
): Promise<MerklePatriciaProof> => {
  const receiptsTrie = await buildReceiptTrie(receipts, blockNumber, blockHash);
  const key = rlp.encode(receipt.transactionIndex);
  const proof = await BaseTrie.createProof(receiptsTrie, key);

  return {
    value: getReceiptBytes(receipt),
    parentNodes: proof.map(bufferToHex),
    root: bufferToHex(receiptsTrie.root),
    path: hexConcat(["0x00", bufferToHex(key)]),
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
  const receiptProof = await buildMerklePatriciaProof(receipt, receipts, burnTxBlock.number, burnTxBlock.hash);
  return {
    receipt,
    receiptProof,
    receiptsRoot: burnTxBlock.receiptsRoot,
  };
};
