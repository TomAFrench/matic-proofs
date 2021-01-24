/* eslint-disable func-names */
import { deployments, ethers } from "hardhat";
import { TransactionReceipt } from "@ethersproject/providers";
import { hexConcat, hexlify } from "@ethersproject/bytes";
import { Contract } from "@ethersproject/contracts";
import { encode } from "@ethersproject/rlp";
import block from "../mockResponses/347-block.json";
import receiptList from "../mockResponses/347-receipt-list.json";
import { buildMerklePatriciaProof, getReceiptBytes } from "../../src/proofs/receiptProof";

const receipts = (receiptList as unknown) as TransactionReceipt[];

// eslint-disable-next-line func-names
export function testBuildMerklePatriciaProof(): void {
  let merklePatricia: Contract;
  beforeAll(async function () {
    await deployments.fixture("TestMerklePatriciaProof");
    merklePatricia = await ethers.getContract("TestMerklePatriciaProof");
  });

  it.each(receipts.slice(0, 1))("should generate a valid proof", async (receipt: TransactionReceipt) => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts, block.number.toString(), block.hash);
    const key = hexConcat(["0x00", hexlify(receipt.transactionIndex)]);
    const rlpParentNodes = encode(receiptProof.parentNodes);
    expect(await merklePatricia.verify(getReceiptBytes(receipt), key, rlpParentNodes, receiptProof.root)).toBe(true);
  });
}
