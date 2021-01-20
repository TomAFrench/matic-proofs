import { TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { rlp } from "ethereumjs-util";
import { BigNumber } from "@ethersproject/bignumber";
import receiptList from "./mockResponses/347-receipt-list.json";
import { buildMerklePatriciaProof, getReceiptBytes } from "../src/proofs/receiptProof";

const receipts = (receiptList as unknown) as TransactionReceipt[];

// eslint-disable-next-line func-names
describe("buildMerklePatriciaProof", function () {
  it.each(receipts)("should generate a valid proof", async (receipt: TransactionReceipt) => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts);

    const receiptBytes = await BaseTrie.verifyProof(
      receiptProof.root,
      rlp.encode(receipt.transactionIndex),
      receiptProof.parentNodes,
    );

    const actualReceiptHex = BigNumber.from(receiptBytes).toHexString();
    const expectedReceiptHex = BigNumber.from(getReceiptBytes(receipt)).toHexString();
    expect(actualReceiptHex).toBe(expectedReceiptHex);

    process.stdout.write(`\r      Proof verified for receipt ${receipt.transactionIndex}`);
  });
});
