/* eslint-disable func-names */
import { deployments, ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { hexConcat } from "@ethersproject/bytes";
import { buildMerkleProof, getBlockHeader } from "../../src/proofs/blockProof";
import { RequiredBlockMembers } from "../../src/types";
import { blocks, CHECKPOINT, CHECKPOINT_ID } from "../mockResponses";

export function testBuildMerkleProof(): void {
  let merkle: Contract;
  beforeAll(async function () {
    await deployments.fixture("TestMerkle");
    merkle = await ethers.getContract("TestMerkle");
  });

  it.each(blocks.slice(0, 1))("should verify the proof", async function (block: RequiredBlockMembers) {
    const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);
    const index = BigNumber.from(block.number).sub(CHECKPOINT.start).toNumber();

    expect(
      await merkle.checkMembership(getBlockHeader(block), index, CHECKPOINT.root, hexConcat(blockProof.blockProof)),
    ).toBe(true);
  });
}
