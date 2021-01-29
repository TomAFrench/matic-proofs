/* eslint-disable func-names */
import { Contract } from "@ethersproject/contracts";
import { deployments, ethers } from "hardhat";

import { JsonRpcProvider } from "@ethersproject/providers";
import chai from "../../chai-setup";
import { buildPayloadForExit, encodePayload, ERC20_TRANSFER_EVENT_SIG } from "../../../src";
import { getCheckpointManager } from "../../../src/utils/contracts";

const { expect } = chai;

const testData: string[] = [
  "0xc9238ec69c604ad58d2e9a10fbda778600e7f5900cb52306e88deba3c5bd661a",
  "0xb5d7a69afc8dd47953883f0b1b6e30daf8a6142114a43b27fcfafe88204fa0c0",
  "0xe09a824e8fbc18668d625a6e585c6c258e7f9c7aa58240d1a39619bb56179c49",
  "0x8f2755d820d0226af2d562f9122e6114818e308e20c496785797ad7993fac8e1",
];

const mainnetProvider = new JsonRpcProvider("https://mainnet.infura.io/v3/8e1441aac766490a8671d8800c334c64");
const maticProvider = new JsonRpcProvider("https://rpc-mainnet.matic.network");
const rootChainManagerProxy = "0xa0c68c638235ee32657e8f720a23cec1bfc77c77";

export function testFullProof(): void {
  let proofVerifier: Contract;
  let checkpointManager: Contract;
  let mainnetCheckpointManager: Contract;
  before(async function () {
    await deployments.fixture("ProofVerifier");
    checkpointManager = await ethers.getContract("MockCheckpointManager");
    proofVerifier = await ethers.getContract("ProofVerifier");
    mainnetCheckpointManager = await getCheckpointManager(mainnetProvider, rootChainManagerProxy);
  });

  testData.forEach(burnHash => {
    it(`should generate a valid proof for burnhash ${burnHash}`, async () => {
      const exitProof = await buildPayloadForExit(
        mainnetProvider,
        maticProvider,
        rootChainManagerProxy,
        burnHash,
        ERC20_TRANSFER_EVENT_SIG,
      );

      // Pull checkpoint from mainnet and insert it onto local chain
      const checkpoint = await mainnetCheckpointManager.headerBlocks(exitProof.headerBlockNumber);
      await checkpointManager.setCheckpoint(
        exitProof.headerBlockNumber,
        checkpoint.root,
        checkpoint.start,
        checkpoint.end,
      );

      const proofPayload = encodePayload(exitProof);
      expect(await proofVerifier.exit(proofPayload)).to.eq(true);
    });
  });
}
