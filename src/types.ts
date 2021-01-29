import { BigNumberish } from "@ethersproject/bignumber";
import { TransactionReceipt } from "@ethersproject/providers";

export interface RequiredBlockMembers {
  hash: string;
  difficulty: string;
  number: string;
  receiptsRoot: string;
  timestamp: string;
  transactions: string[];
  transactionsRoot: string;
}

export type HeaderBlockCheckpoint = {
  root: string;
  start: BigNumberish;
  end: BigNumberish;
  createdAt: BigNumberish;
  proposer: string;
};

export type MerklePatriciaProof = {
  value: string;
  path: string;
  parentNodes: string[];
  root: string;
};

export interface BlockProof {
  burnTxBlockNumber: number;
  burnTxBlockTimestamp: number;
  transactionsRoot: string;
  receiptsRoot: string;
  headerBlockNumber: number;
  blockProof: string[];
}

export type ReceiptProof = {
  receipt: TransactionReceipt;
  receiptProof: ReceiptMPProof;
  receiptsRoot: string;
};

export interface ExitProof {
  headerBlockNumber: number;
  blockProof: string[];
  burnTxBlockNumber: number;
  burnTxBlockTimestamp: number;
  transactionsRoot: string;
  receiptsRoot: string;
  receipt: TransactionReceipt;
  receiptProofParentNodes: string[];
  receiptProofPath: string;
  logIndex: number;
}
