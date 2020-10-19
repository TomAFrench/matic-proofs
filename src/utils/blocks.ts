import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
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

export const getFullBlockByNumber = (
  provider: JsonRpcProvider,
  blockNumber: BigNumberish,
): Promise<RequiredBlockMembers> =>
  provider.perform("getBlock", {
    blockTag: toTrimmedHexString(blockNumber),
  });
