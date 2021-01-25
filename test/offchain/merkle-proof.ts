/* eslint-disable func-names */
import { BigNumber } from "@ethersproject/bignumber";
import MerkleTree from "../../src/utils/merkleTree";
import { buildMerkleProof, getBlockHeader } from "../../src/proofs/blockProof";
import { RequiredBlockMembers } from "../../src/types";
import { blocks, CHECKPOINT, CHECKPOINT_ID } from "../mockResponses";

export function testBuildMerkleProof(): void {
  it("produces a tree which matches checkpoint's root", async () => {
    const merkleTree = new MerkleTree(blocks.map(getBlockHeader));

    expect(merkleTree.getRoot()).toBe(CHECKPOINT.root);
  });

  it.each(blocks.slice(0, 1))("should generate a valid proof", async (block: RequiredBlockMembers) => {
    const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);

    const index = BigNumber.from(block.number).sub(CHECKPOINT.start).toNumber();
    expect(MerkleTree.verify(getBlockHeader(block), index, CHECKPOINT.root, blockProof.blockProof)).toBe(true);

    process.stdout.write(`\r      Proof verified for block ${index + 1}`);
  });
}
