/* eslint-disable func-names */
import { BigNumber } from "@ethersproject/bignumber";
import { JsonRpcProvider } from "@ethersproject/providers";
import {
  fallbackFindBlockCheckpointId,
  getBlockCheckpoint,
  subgraphGetCheckpoint,
} from "../../../src/utils/checkpoint";
import { getCheckpointManager } from "../../../src/utils/contracts";
import chai from "../../chai-setup";
import { block, CHECKPOINT_ID } from "../../mockResponses";

const { expect } = chai;

const testData: [number, number][] = [
  [9826737, 96930000],
  [8689955, 88920000],
  [8657042, 88660000],
  [463242, 8660000],
  [9840896, 97070000],
];

const rootChainManagerProxy = "0xa0c68c638235ee32657e8f720a23cec1bfc77c77";

export function testFindBlockCheckpointId(): void {
  testData.forEach(([blockNumber, expectedCheckpointId]) => {
    it(`should return ${expectedCheckpointId} as the checkpoint id for block number ${blockNumber}`, async () => {
      const provider = new JsonRpcProvider("https://mainnet.infura.io/v3/8e1441aac766490a8671d8800c334c64");
      const checkpointManager = await getCheckpointManager(provider, rootChainManagerProxy);
      const checkpointId = await fallbackFindBlockCheckpointId(checkpointManager, BigNumber.from(blockNumber));

      expect(checkpointId).to.eq(expectedCheckpointId);
    });

    it(`should return match the value reported by the subgraph for block number ${blockNumber}`, async () => {
      const { checkpointId } = await subgraphGetCheckpoint(1, blockNumber);

      expect(checkpointId).to.eq(expectedCheckpointId);
    });
  });

  it(`should fall back to an on-chain lookup if no subgraph exists for this network`, async () => {
    const provider = new JsonRpcProvider("https://mainnet.infura.io/v3/8e1441aac766490a8671d8800c334c64");
    provider.getNetwork = async () => ({ name: "Bad network", chainId: 100 });
    const { checkpointId } = await getBlockCheckpoint(provider, rootChainManagerProxy, BigNumber.from(block.number));

    expect(checkpointId).to.eq(CHECKPOINT_ID);
  });
}
