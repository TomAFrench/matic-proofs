/* eslint-disable func-names */
import { deployments, ethers } from "hardhat";
import { hexConcat, hexlify } from "@ethersproject/bytes";
import { Contract } from "@ethersproject/contracts";
import { encode } from "@ethersproject/rlp";
import { buildMerklePatriciaProof, getReceiptBytes } from "../../src/proofs/receiptProof";
import { block, receipt, receipts } from "../mockResponses";
import chai from "../chai-setup";

const { expect } = chai;

// eslint-disable-next-line func-names
export function testBuildMerklePatriciaProof(): void {
  let merklePatricia: Contract;
  before(async function () {
    await deployments.fixture("TestMerklePatriciaProof");
    merklePatricia = await ethers.getContract("TestMerklePatriciaProof");
  });

  it("should generate a valid proof", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts, block.number.toString(), block.hash);
    const key = hexConcat(["0x00", hexlify(receipt.transactionIndex)]);
    const rlpParentNodes = encode(receiptProof.parentNodes);
    expect(await merklePatricia.verify(getReceiptBytes(receipt), key, rlpParentNodes, receiptProof.root)).to.eq(true);
  });
}
