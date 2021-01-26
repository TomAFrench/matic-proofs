/* eslint-disable func-names */
import { deployments, ethers } from "hardhat";
import { hexConcat } from "@ethersproject/bytes";
import { Contract } from "@ethersproject/contracts";
import { bufferToHex, rlp } from "ethereumjs-util";
import { buildMerklePatriciaProof, getReceiptBytes } from "../../src/proofs/receiptProof";
import { block, receipt, receipts } from "../mockResponses";
import chai from "../chai-setup";
import { hexToBuffer } from "../../src/utils/buffer";

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
    const path = hexConcat(["0x00", bufferToHex(rlp.encode(receipt.transactionIndex))]);
    const rlpParentNodes = bufferToHex(rlp.encode(receiptProof.parentNodes.map(node => rlp.decode(hexToBuffer(node)))));

    expect(await merklePatricia.verify(getReceiptBytes(receipt), path, rlpParentNodes, receiptProof.root)).to.eq(true);
  });
}
