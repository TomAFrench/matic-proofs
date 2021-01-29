/* eslint-disable func-names */
import { testFullProof as testFullProofOffChain } from "./proofs/offchain/full-proof";
import { testBuildMerkleProof as testBuildMerkleProofOffchain } from "./proofs/offchain/merkle-proof";
import { testFastMerkleProof as testFastMerkleProofOffchain } from "./proofs/offchain/fast-merkle-proof";
import { testBuildMerklePatriciaProof as testBuildMerklePatriciaProofOffchain } from "./proofs/offchain/merkle-patricia-proof";
import { testBuildMerkleProof as testBuildMerkleProofOnchain } from "./proofs/onchain/merkle-proof";
import { testBuildMerklePatriciaProof as testBuildMerklePatriciaProofOnchain } from "./proofs/onchain/merkle-patricia-proof";
import { testFullProof as testFullProofOnchain } from "./proofs/onchain/full-proof";
import { testFindBlockCheckpointId } from "./dataFetching/findCheckpoint";
import { testCalculateExitHash } from "./dataFetching/calculateExitHash";
import { testFullProof as testFullProofOnchainIntegration } from "./integration/proofs/full-proof";

describe("Unit tests", function () {
  describe("Data Fetching", function () {
    describe("findBlockCheckpointId", function () {
      testFindBlockCheckpointId();
    });
    describe("calculateExitHash", function () {
      testCalculateExitHash();
    });
  });
  describe("Proofs", function () {
    describe("Javascript checks", function () {
      describe("buildMerkleProof", function () {
        testBuildMerkleProofOffchain();
      });

      describe("fastMerkleProof", function () {
        testFastMerkleProofOffchain();
      });

      describe("buildMerklePatriciaProof", function () {
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

      describe("buildMerklePatriciaProof", function () {
        testBuildMerklePatriciaProofOnchain();
      });

      describe("buildFullProof", function () {
        testFullProofOnchain();
      });
    });
  });
});

describe("Integration tests", function () {
  describe("Proofs", function () {
    describe("Solidity checks", function () {
      describe("buildFullProof", function () {
        testFullProofOnchainIntegration();
      });
    });
  });
});
