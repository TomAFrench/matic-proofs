/* eslint-disable func-names */
import { BigNumber } from "@ethersproject/bignumber";
import MerkleTree from "../../../src/utils/merkleTree";
import { buildMerkleProof, getBlockHeader } from "../../../src/proofs/blockProof";
import { blocks, CHECKPOINT, CHECKPOINT_ID } from "../../mockResponses";
import chai from "../../chai-setup";

const { expect } = chai;

export function testBuildMerkleProof(): void {
  it("produces a tree which matches checkpoint's root", async () => {
    const merkleTree = new MerkleTree(blocks.map(getBlockHeader));

    expect(merkleTree.getRoot()).to.eq(CHECKPOINT.root);
  });

  it("should generate a valid proof", async () => {
    const block = blocks[0];
    const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);

    const index = BigNumber.from(block.number).sub(CHECKPOINT.start).toNumber();
    expect(MerkleTree.verify(getBlockHeader(block), index, CHECKPOINT.root, blockProof.blockProof)).to.eq(true);
  });
}
