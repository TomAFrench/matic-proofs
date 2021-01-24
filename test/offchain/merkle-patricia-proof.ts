/* eslint-disable func-names */
import { TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { BigNumber } from "@ethersproject/bignumber";
import { arrayify } from "@ethersproject/bytes";
import { encode } from "@ethersproject/rlp";
import { bufferToHex } from "ethereumjs-util";
import block from "../mockResponses/347-block.json";
import receiptList from "../mockResponses/347-receipt-list.json";
import { buildMerklePatriciaProof, getReceiptBytes } from "../../src/proofs/receiptProof";
import { hexToBuffer } from "../../src/utils/buffer";

const receipts = (receiptList as unknown) as TransactionReceipt[];

export function testBuildMerklePatriciaProof(): void {
  it("produces a trie which matches block's receipt root", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipts[0], receipts);

    expect(receiptProof.root).toBe(block.receiptsRoot);
  });

  it.skip.each(receipts.slice(0, 1))("should generate a valid proof", async (receipt: TransactionReceipt) => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts);

    const receiptBytes = await BaseTrie.verifyProof(
      hexToBuffer(receiptProof.root),
      hexToBuffer(encode(arrayify(receipt.transactionIndex))),
      receiptProof.parentNodes.map(hexToBuffer),
    );

    expect(receiptBytes).not.toBeNull();

    const actualReceiptHex = bufferToHex(receiptBytes as Buffer);
    const expectedReceiptHex = BigNumber.from(getReceiptBytes(receipt)).toHexString();
    expect(actualReceiptHex).toBe(expectedReceiptHex);

    process.stdout.write(`\r      Proof verified for receipt ${receipt.transactionIndex}`);
  });
}
