/* eslint-disable func-names */
import { BaseTrie } from "merkle-patricia-tree";
import { hexlify } from "@ethersproject/bytes";
import { encode } from "@ethersproject/rlp";
import { bufferToHex } from "ethereumjs-util";

import { buildMerklePatriciaProof, getReceiptBytes } from "../../src/proofs/receiptProof";
import { hexToBuffer } from "../../src/utils/buffer";
import { block, receipt, receipts } from "../mockResponses";
import chai from "../chai-setup";
import { referenceReceiptBytesImplementation } from "../utils/getReceiptBytes";

const { expect } = chai;

export function testBuildMerklePatriciaProof(): void {
  it("correctly calculates the receiptBytes", () => {
    const expectedReceiptHex = bufferToHex(referenceReceiptBytesImplementation(receipt));
    const actualReceiptHex = getReceiptBytes(receipt);
    expect(actualReceiptHex).to.eq(expectedReceiptHex);
  });

  it("produces a trie which matches block's receipt root", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipts[0], receipts, block.number.toString(), block.hash);

    expect(receiptProof.root).to.eq(block.receiptsRoot);
  });

  it("should generate a valid proof", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts, block.number.toString(), block.hash);

    const receiptBytes = await BaseTrie.verifyProof(
      hexToBuffer(receiptProof.root),
      hexToBuffer(encode(hexlify(receipt.transactionIndex))),
      receiptProof.parentNodes.map(hexToBuffer),
    );

    expect(receiptBytes).to.not.eq(null);

    const actualReceiptHex = bufferToHex(receiptBytes as Buffer);
    const expectedReceiptHex = getReceiptBytes(receipt);
    expect(actualReceiptHex).to.eq(expectedReceiptHex);
  });
}
