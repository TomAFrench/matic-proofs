/* eslint-disable func-names */
import { JsonRpcProvider } from "@ethersproject/providers";
import { ERC20_TRANSFER_EVENT_SIG } from "../../src";
import { calculateExitHash } from "../../src/checks";
import chai from "../chai-setup";

const { expect } = chai;

const testData: [string, string][] = [
  [
    "0xc9238ec69c604ad58d2e9a10fbda778600e7f5900cb52306e88deba3c5bd661a",
    "0x6616640c962baab1a38d9084348695d7837386108ebfc5ba37b66321a4d0707b",
  ],
  [
    "0xb5d7a69afc8dd47953883f0b1b6e30daf8a6142114a43b27fcfafe88204fa0c0",
    "0x1c75e76a1ff3f459ade0071cb5e92014092a3d7c261375d3a541e6d71c3a15b7",
  ],
];

export function testCalculateExitHash(): void {
  testData.forEach(([burnHash, expectedExitHash]) => {
    it(`should return ${expectedExitHash} as exit hash for burn hash ${burnHash}`, async () => {
      const provider = new JsonRpcProvider("https://rpc-mainnet.matic.network");

      const exitHash = await calculateExitHash(provider, burnHash, ERC20_TRANSFER_EVENT_SIG);

      expect(exitHash).to.eq(expectedExitHash);
    });
  });
}
