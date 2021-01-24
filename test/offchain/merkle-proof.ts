/* eslint-disable func-names */
import { BigNumber } from "@ethersproject/bignumber";
import blockList from "../mockResponses/blocks.json";
import MerkleTree from "../../src/utils/merkleTree";
import { buildMerkleProof, getBlockHeader } from "../../src/proofs/blockProof";
import { HeaderBlockCheckpoint, RequiredBlockMembers } from "../../src/types";

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
  it("produces a tree which matches checkpoint's root", async () => {
    const merkleTree = new MerkleTree(blocks.map(getBlockHeader));

    expect(merkleTree.getRoot()).toBe(checkpoint.root);
  });

  it.each(blocks.slice(0, 1))("should generate a valid proof", async (block: RequiredBlockMembers) => {
    const blockProof = await buildMerkleProof(block, blocks, checkpointId);

    const index = BigNumber.from(block.number).sub(checkpoint.start).toNumber();
    expect(MerkleTree.verify(getBlockHeader(block), index, checkpoint.root, blockProof.blockProof)).toBe(true);

    process.stdout.write(`\r      Proof verified for block ${index + 1}`);
  });
}
