/* eslint-disable func-names */
import { Contract } from "@ethersproject/contracts";
import { deployments, ethers } from "hardhat";

import { encodePayload, ERC20_TRANSFER_EVENT_SIG } from "../../../src";
import { buildMerkleProof } from "../../../src/proofs/blockProof";
import { buildMerklePatriciaProof } from "../../../src/proofs/receiptProof";
import { ExitProof } from "../../../src/types";
import { getLogIndex } from "../../../src/utils/logIndex";
import { block, blocks, CHECKPOINT, CHECKPOINT_ID, receipt, receipts } from "../../mockResponses";
import chai from "../../chai-setup";

const { expect } = chai;

export function testFullProof(): void {
  let proofVerifier: Contract;
  before(async function () {
    await deployments.fixture("ProofVerifier");
    const checkpointManager = await ethers.getContract("MockCheckpointManager");
    await checkpointManager.setCheckpoint(CHECKPOINT_ID, CHECKPOINT.root, CHECKPOINT.start, CHECKPOINT.end);
    proofVerifier = await ethers.getContract("ProofVerifier");
  });

  it("should generate a valid proof", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts, block.number, block.hash);
    const blockProof = await buildMerkleProof(block, blocks, CHECKPOINT_ID);
    const logIndex = getLogIndex(receipt, ERC20_TRANSFER_EVENT_SIG);

    const exitProof: ExitProof = {
      headerBlockNumber: CHECKPOINT_ID.toNumber(),
      blockProof: blockProof.blockProof,
      burnTxBlockNumber: blockProof.burnTxBlockNumber,
      burnTxBlockTimestamp: blockProof.burnTxBlockTimestamp,
      transactionsRoot: blockProof.transactionsRoot,
      receiptsRoot: blockProof.receiptsRoot,
      receipt,
      receiptProofParentNodes: receiptProof.parentNodes,
      receiptProofPath: receiptProof.path,
      logIndex,
    };

    const proofPayload = encodePayload(exitProof);
    expect(await proofVerifier.exit(proofPayload)).to.eq(true);
  });
}
