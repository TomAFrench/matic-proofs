/* eslint-disable func-names */
import { testFullProof as testFullProofOffChain } from "./offchain/full-proof";
import { testBuildMerkleProof as testBuildMerkleProofOffchain } from "./offchain/merkle-proof";
import { testBuildMerklePatriciaProof as testBuildMerklePatriciaProofOffchain } from "./offchain/merkle-patricia-proof";
import { testBuildMerkleProof as testBuildMerkleProofOnchain } from "./onchain/merkle-proof";
import { testBuildMerklePatriciaProof as testBuildMerklePatriciaProofOnchain } from "./onchain/merkle-patricia-proof";
import { testFullProof as testFullProofOnchain } from "./onchain/full-proof";

describe("Unit tests", function () {
  describe("Javascript checks", function () {
    describe("buildMerkleProof", function () {
      testBuildMerkleProofOffchain();
    });

    describe("buildMerklePatriciaProof", function () {
      testBuildMerklePatriciaProofOffchain();
    });

    describe.skip("buildFullProof", function () {
      testFullProofOffChain();
    });
  });

  describe("Solidity checks", function () {
    describe("buildMerkleProof", function () {
      testBuildMerkleProofOnchain();
    });

    describe("buildMerklePatriciaProof", function () {
      testBuildMerklePatriciaProofOnchain();
    });

    describe.skip("buildFullProof", function () {
      testFullProofOnchain();
    });
  });
});
