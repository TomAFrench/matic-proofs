/* eslint-disable func-names */
import { testFullProof as testFullProofOffChain } from "./offchain/full-proof";
import { testBuildMerkleProof as testBuildMerkleProofOffchain } from "./offchain/merkle-proof";
import { testBuildMerklePatriciaProof as testBuildMerklePatriciaProofOffchain } from "./offchain/merkle-patricia-proof";
import { testBuildMerkleProof as testBuildMerkleProofOnchain } from "./onchain/merkle-proof";
import { testBuildMerklePatriciaProof as testBuildMerklePatriciaProofOnchain } from "./onchain/merkle-patricia-proof";
import { testFullProof as testFullProofOnchain } from "./onchain/full-proof";

describe("Unit tests", function () {
  describe("Javascript checks", function () {
    describe.only("buildMerkleProof", function () {
      testBuildMerkleProofOffchain();
    });

    describe.only("buildMerklePatriciaProof", function () {
      testBuildMerklePatriciaProofOffchain();
    });

    describe("buildFullProof", function () {
      testFullProofOffChain();
    });
  });

  describe("Solidity checks", function () {
    describe("buildMerkleProof", function () {
      testBuildMerkleProofOnchain();
    });

    describe.only("buildMerklePatriciaProof", function () {
      testBuildMerklePatriciaProofOnchain();
    });

    describe("buildFullProof", function () {
      testFullProofOnchain();
    });
  });
});
