/* eslint-disable func-names */
import { JsonRpcProvider } from "@ethersproject/providers";
import { EventSignature } from "../../../src";
import { calculateExitHash } from "../../../src/checks";
import chai from "../../chai-setup";

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
  [
    "0xe09a824e8fbc18668d625a6e585c6c258e7f9c7aa58240d1a39619bb56179c49",
    "0xe50b3ecc36eb4968e87f1e5b8187afdc90af0d95d8ed970928bf8224452780d2",
  ],
  [
    "0x8f2755d820d0226af2d562f9122e6114818e308e20c496785797ad7993fac8e1",
    "0x6d754044acaf4f21cc37dcface34ec3b745a86dc657c0e689b598413d7c886cf", // This hash needs to be checked
  ],
];

export function testCalculateExitHash(): void {
  testData.forEach(([burnHash, expectedExitHash]) => {
    it(`should return ${expectedExitHash} as exit hash for burn hash ${burnHash}`, async () => {
      const provider = new JsonRpcProvider("https://rpc-mainnet.matic.network");

      const exitHash = await calculateExitHash(provider, burnHash, EventSignature.ERC20Transfer);

      expect(exitHash).to.eq(expectedExitHash);
    });
  });
}
