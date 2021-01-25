/* eslint-disable func-names */
import { TransactionReceipt } from "@ethersproject/providers";
import { BaseTrie } from "merkle-patricia-tree";
import { hexlify } from "@ethersproject/bytes";
import { encode } from "@ethersproject/rlp";
import { bufferToHex } from "ethereumjs-util";

import { buildMerklePatriciaProof, getReceiptBytes } from "../../src/proofs/receiptProof";
import { hexToBuffer } from "../../src/utils/buffer";
import { block, receipts } from "../mockResponses";

export function testBuildMerklePatriciaProof(): void {
  it("produces a trie which matches block's receipt root", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipts[0], receipts, block.number.toString(), block.hash);

    expect(receiptProof.root).toBe(block.receiptsRoot);
  });

  it.each(receipts.slice(0, 1))("should generate a valid proof", async (receipt: TransactionReceipt) => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts, block.number.toString(), block.hash);

    const receiptBytes = await BaseTrie.verifyProof(
      hexToBuffer(receiptProof.root),
      hexToBuffer(encode(hexlify(receipt.transactionIndex))),
      receiptProof.parentNodes.map(hexToBuffer),
    );

    expect(receiptBytes).not.toBeNull();

    const actualReceiptHex = bufferToHex(receiptBytes as Buffer);
    const expectedReceiptHex = getReceiptBytes(receipt);
    expect(actualReceiptHex).toBe(expectedReceiptHex);

    process.stdout.write(`\r      Proof verified for receipt ${receipt.transactionIndex}`);
  });
}
