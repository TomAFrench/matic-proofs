/* eslint-disable func-names */
import { JsonRpcProvider } from "@ethersproject/providers";
import { findBlockCheckpointId } from "../../src/utils/checkpoint";
import { getCheckpointManager } from "../../src/utils/contracts";
import chai from "../chai-setup";

const { expect } = chai;

const testData: [number, number][] = [
  [9826737, 96930000],
  [8689955, 88920000],
  [8657042, 88660000],
  [463242, 8660000],
  [9840896, 97070000],
];

export function testFindBlockCheckpointId(): void {
  testData.forEach(([blockNumber, expectedCheckpointId]) => {
    it(`should return ${expectedCheckpointId} as the checkpoint id for block number ${blockNumber}`, async () => {
      const provider = new JsonRpcProvider("https://mainnet.infura.io/v3/8e1441aac766490a8671d8800c334c64");

      const rootChainManagerProxy = "0xa0c68c638235ee32657e8f720a23cec1bfc77c77";
      const checkpointManager = await getCheckpointManager(provider, rootChainManagerProxy);
      const checkpointId = await findBlockCheckpointId(checkpointManager, blockNumber);

      expect(checkpointId).to.eq(expectedCheckpointId);
    });
  });
}
