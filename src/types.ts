import { BigNumberish } from "@ethersproject/bignumber";
import { TransactionReceipt } from "@ethersproject/providers";
import { rlp } from "ethereumjs-util";

export interface RequiredBlockMembers {
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

export type ReceiptMPProof = {
  parentNodes: Buffer[];
  root: Buffer;
  path: Buffer;
  value: Buffer | Buffer[] | rlp.Decoded;
};

export interface BlockProof {
  burnTxBlockNumber: number;
  burnTxBlockTimestamp: number;
  transactionsRoot: Buffer;
  receiptsRoot: Buffer;
  headerBlockNumber: number;
  blockProof: Buffer[];
}

export type ReceiptProof = {
  receipt: TransactionReceipt;
  receiptProof: ReceiptMPProof;
  receiptsRoot: Buffer;
};

export interface ExitProof {
  headerBlockNumber: number;
  blockProof: Buffer[];
  burnTxBlockNumber: number;
  burnTxBlockTimestamp: number;
  transactionsRoot: Buffer;
  receiptsRoot: Buffer;
  receipt: Buffer;
  receiptProofParentNodes: Buffer[];
  receiptProofPath: Buffer;
  logIndex: number;
}
