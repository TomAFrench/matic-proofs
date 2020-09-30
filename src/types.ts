import { rlp } from "ethereumjs-util";

export interface RequiredBlockMembers {
  difficulty: string;
  number: string;
  receiptsRoot: string;
  timestamp: string;
  transactions: string[];
  transactionsRoot: string;
}

export type ReceiptProof = {
  blockHash: Buffer;
  parentNodes: Buffer[];
  root: Buffer;
  path: Buffer;
  value: Buffer | Buffer[] | rlp.Decoded;
};

export interface ExitProof {
  headerBlockNumber: string;
  blockProof: any;
  burnTxBlockNumber: string;
  burnTxBlockTimestamp: string;
  transactionsRoot: Buffer;
  receiptsRoot: Buffer;
  receipt: Buffer;
  receiptProofParentNodes: Buffer[];
  receiptProofPath: Buffer;
  logIndex: number;
}
