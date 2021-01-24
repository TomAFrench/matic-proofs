/* eslint-disable func-names */
import { deployments, ethers } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { hexConcat } from "@ethersproject/bytes";
import { buildMerkleProof, getBlockHeader } from "../../src/proofs/blockProof";
import { HeaderBlockCheckpoint, RequiredBlockMembers } from "../../src/types";
import blockList from "../mockResponses/blocks.json";

const checkpointId = BigNumber.from(96830000);
const checkpoint: HeaderBlockCheckpoint = {
  root: "0x1cb083333652cea4873132e292e9e8808a5666dc5ebdf339829076cbec4f5ad1",
  start: 9807772,
  end: 9811099,
  createdAt: 1611108441,
  proposer: "0x8a08Cfd1Cc3012576d6e2d3937b0d5F248701f24",
};

const blocks = (blockList as unknown) as RequiredBlockMembers[];

export function testBuildMerkleProof(): void {
  let merkle: Contract;
  beforeAll(async function () {
    await deployments.fixture("TestMerkle");
    merkle = await ethers.getContract("TestMerkle");
  });

  it.each(blocks.slice(0, 1))("should verify the proof", async function (block: RequiredBlockMembers) {
    const blockProof = await buildMerkleProof(block, blocks, checkpointId);
    const index = BigNumber.from(block.number).sub(checkpoint.start).toNumber();

    expect(
      await merkle.checkMembership(getBlockHeader(block), index, checkpoint.root, hexConcat(blockProof.blockProof)),
    ).toBe(true);
  });
}
