import { BigNumber } from "@ethersproject/bignumber";
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

export interface HeaderBlockCheckpoint {
  root: string;
  start: BigNumber;
  end: BigNumber;
  createdAt: BigNumber;
  proposer: string;
}

export type Checkpoint = Omit<HeaderBlockCheckpoint, "createdAt" | "proposer"> & {
  checkpointId: BigNumber;
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

export interface ReceiptProof extends MerklePatriciaProof {
  receipt: TransactionReceipt;
}

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
