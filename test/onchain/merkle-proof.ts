/* eslint-disable func-names */
import { deployments, ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { hexConcat } from "@ethersproject/bytes";
import { buildMerkleProof, getBlockHeader } from "../../src/proofs/blockProof";
import { block, blocks, CHECKPOINT, CHECKPOINT_ID } from "../mockResponses";
import chai from "../chai-setup";

const { expect } = chai;

export function testBuildMerkleProof(): void {
  let merkle: Contract;
  before(async function () {
    await deployments.fixture("TestMerkle");
    merkle = await ethers.getContract("TestMerkle");
  });

  it("should verify the proof", async function () {
    const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);
    const index = BigNumber.from(block.number).sub(CHECKPOINT.start).toNumber();

    expect(
      await merkle.checkMembership(getBlockHeader(block), index, CHECKPOINT.root, hexConcat(blockProof.blockProof)),
    ).to.eq(true);
  });
}
