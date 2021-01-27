/* eslint-disable func-names */
import { BigNumber } from "@ethersproject/bignumber";
import { JsonRpcProvider } from "@ethersproject/providers";
import { buildMerkleProof } from "../../src/proofs/blockProof";
import { blocks, CHECKPOINT, CHECKPOINT_ID } from "../mockResponses";
import chai from "../chai-setup";
import { getFastMerkleProof } from "../../src/utils/fastMerkle";

const { expect } = chai;

const sampleBlocks = [
  0,
  1,
  2,
  3,
  10,
  124,
  256,
  512,
  1024,
  blocks.length - 10,
  blocks.length - 3,
  blocks.length - 2,
  blocks.length - 1,
];
export function testFastMerkleProof(): void {
  sampleBlocks.forEach(blockIndex => {
    it(`matches the proof given by buildMerkleProof for blockIndex ${blockIndex}`, async () => {
      const block = blocks[blockIndex];
      const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);

      const fastMerkle = await getFastMerkleProof(
        new JsonRpcProvider("https://rpc-mainnet.matic.network"),
        BigNumber.from(block.number).toNumber(),
        BigNumber.from(CHECKPOINT.start).toNumber(),
        BigNumber.from(CHECKPOINT.end).toNumber(),
      );

      // console.log("Fast", fastMerkle);
      // console.log("Slow", blockProof.blockProof);

      expect(fastMerkle.length).to.eq(blockProof.blockProof.length);
      fastMerkle.forEach((hash, index) => {
        expect(hash).to.eq(blockProof.blockProof[index]);
      });
    });
  });
}
