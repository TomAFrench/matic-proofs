import { Contract } from "@ethersproject/contracts";
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

const BIG_ONE = BigNumber.from(1);
const BIG_TWO = BigNumber.from(2);
const CHECKPOINT_ID_INTERVAL = BigNumber.from(10000);

export const findHeaderBlockNumber = async (
  checkpointManagerContract: Contract,
  childBlockNumber: BigNumberish,
): Promise<BigNumber> => {
  // eslint-disable-next-line no-param-reassign
  childBlockNumber = BigNumber.from(childBlockNumber);
  // first checkpoint id = start * 10000
  let start = BIG_ONE;

  // last checkpoint id = end * 10000
  let end = BigNumber.from(await checkpointManagerContract.currentHeaderBlock()).div(CHECKPOINT_ID_INTERVAL);
  if (start.gt(end)) {
    throw new Error("start block is greater than end block");
  }

  // binary search on all the checkpoints to find the checkpoint that contains the childBlockNumber
  let ans = start;
  while (start.lte(end)) {
    if (start.eq(end)) {
      ans = start;
      break;
    }
    const mid = start.add(end).div(BIG_TWO);
    // eslint-disable-next-line no-await-in-loop
    const headerBlock = await checkpointManagerContract.headerBlocks(mid.mul(CHECKPOINT_ID_INTERVAL).toString());
    const headerStart = BigNumber.from(headerBlock.start);
    const headerEnd = BigNumber.from(headerBlock.end);

    if (headerStart.lte(childBlockNumber) && childBlockNumber.lte(headerEnd)) {
      // if childBlockNumber is between the upper and lower bounds of the headerBlock, we found our answer
      ans = mid;
      break;
    } else if (headerStart.gt(childBlockNumber)) {
      // childBlockNumber was checkpointed before this header
      end = mid.sub(BIG_ONE);
    } else if (headerEnd.lt(childBlockNumber)) {
      // childBlockNumber was checkpointed after this header
      start = mid.add(BIG_ONE);
    }
  }
  return ans.mul(CHECKPOINT_ID_INTERVAL);
};
