/* eslint-disable func-names */
import { HashZero } from "@ethersproject/constants";
import { JsonRpcProvider } from "@ethersproject/providers";
import { isRootTxStateSynced } from "../../../src";
import chai from "../../chai-setup";

const { expect } = chai;

const testData: [string, boolean][] = [["0x780ce87c343fbae7f38b3d5346a0bfc7d109fe184407385aaf7103abeb01dc77", true]];

const rootProvider = new JsonRpcProvider("https://mainnet.infura.io/v3/8e1441aac766490a8671d8800c334c64");
const childProvider = new JsonRpcProvider("https://rpc-mainnet.matic.network");

export function testIsRootTxStateSynced(): void {
  testData.forEach(([txHash, expectedSyncStatus]) => {
    it(`should return ${expectedSyncStatus} as the sync status for transaction hash ${txHash}`, async () => {
      expect(await isRootTxStateSynced(rootProvider, childProvider, txHash)).to.eq(expectedSyncStatus);
    });
  });
}
