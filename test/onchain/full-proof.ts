/* eslint-disable func-names */
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { TransactionReceipt } from "@ethersproject/providers";
import { deployments, ethers } from "hardhat";

import { encodePayload, ERC20_TRANSFER_EVENT_SIG } from "../../src";
import { buildMerkleProof } from "../../src/proofs/blockProof";
import { buildMerklePatriciaProof } from "../../src/proofs/receiptProof";
import { ExitProof, HeaderBlockCheckpoint, RequiredBlockMembers } from "../../src/types";
import { getLogIndex } from "../../src/utils/logIndex";

import blockList from "../mockResponses/blocks2.json";
import receiptList from "../mockResponses/receipts2.json";

const burnHash = "0xc9238ec69c604ad58d2e9a10fbda778600e7f5900cb52306e88deba3c5bd661a";
const checkpointId = BigNumber.from(96930000);
const checkpoint: HeaderBlockCheckpoint = {
  root: "0xe459e9f7439f54989ee693ba93802793c02880a824979d476544378d3f66d174",
  start: 9825948,
  end: 9827227,
  createdAt: 1611142592,
  proposer: "0x7fCD58C2D53D980b247F1612FdbA93E9a76193E6",
};

export function testFullProof(): void {
  const blocks = (blockList as unknown) as RequiredBlockMembers[];
  const block = blocks.find(testBlock => testBlock.transactions.includes(burnHash));
  if (typeof block === "undefined") {
    throw new Error("Could not find block");
  }

  const receipts = (receiptList as unknown) as TransactionReceipt[];
  const receipt = receipts.find(testReceipt => testReceipt.transactionHash === burnHash);
  if (typeof receipt === "undefined") {
    throw new Error("Could not find receipt");
  }

  let proofVerifier: Contract;
  beforeAll(async function () {
    await deployments.fixture("ProofVerifier");
    const checkpointManager = await ethers.getContract("MockCheckpointManager");
    await checkpointManager.setCheckpoint(checkpoint.root, checkpoint.start, checkpoint.end);
    proofVerifier = await ethers.getContract("ProofVerifier");
  });

  it("should generate a valid proof", async () => {
    const receiptProof = await buildMerklePatriciaProof(receipt, receipts);
    const blockProof = await buildMerkleProof(block, blocks, checkpointId);
    const logIndex = getLogIndex(receipt, ERC20_TRANSFER_EVENT_SIG);

    const exitProof: ExitProof = {
      headerBlockNumber: checkpointId.toNumber(),
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
    expect(await proofVerifier.exit(proofPayload)).toBe(true);
  });
}
