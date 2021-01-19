import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { map } from "bluebird";
import { RequiredBlockMembers } from "../types";

// ethers adds some leading zeros in some cases which we want to strip
const toTrimmedHexString = (hexNumber: BigNumberish) => {
  let hexString = BigNumber.from(hexNumber).toHexString();

  while (hexString.length > 3 && hexString.substring(0, 3) === "0x0") {
    // eslint-disable-next-line no-param-reassign
    hexString = "0x" + hexString.substring(3);
  }
  return hexString;
};

// provider.getBlock does not return the transactionsRoot or receiptsRoot
// We then use the lower level `perform` method directly
export const getFullBlockByHash = async (provider: JsonRpcProvider, blockHash: string): Promise<RequiredBlockMembers> =>
  provider.perform("getBlock", { blockHash });

const getFullBlockByNumber = (provider: JsonRpcProvider, blockNumber: BigNumberish): Promise<RequiredBlockMembers> =>
  provider.perform("getBlock", {
    blockTag: toTrimmedHexString(blockNumber),
  });

export const getBlocksInRange = async (
  provider: JsonRpcProvider,
  start: number,
  end: number,
): Promise<RequiredBlockMembers[]> => {
  const blocks = new Array(end - start + 1);
  await map(
    blocks,
    async (_, index: number) => {
      blocks[index] = await getFullBlockByNumber(provider, start + index);
    },
    { concurrency: 10 },
  );

  return blocks;
};
