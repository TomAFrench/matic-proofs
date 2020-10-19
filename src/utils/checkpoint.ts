import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

import checkpointManagerABI from "../abi/ICheckpointManager.json";
import rootChainABI from "../abi/RootChainManager.json";
import { HeaderBlockCheckpoint } from "../types";

export const findHeaderBlockNumber = async (
  checkpointManagerContract: Contract,
  childBlockNumber: BigNumberish,
  checkpointIdInterval: BigNumberish = BigNumber.from(10000),
): Promise<BigNumber> => {
  // eslint-disable-next-line no-param-reassign
  childBlockNumber = BigNumber.from(childBlockNumber);
  // first checkpoint id = start * 10000
  let start = BigNumber.from(1);

  // last checkpoint id = end * 10000
  let end = BigNumber.from(await checkpointManagerContract.currentHeaderBlock()).div(checkpointIdInterval);
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
    const mid = start.add(end).div(2);
    // eslint-disable-next-line no-await-in-loop
    const headerBlock = await checkpointManagerContract.headerBlocks(mid.mul(checkpointIdInterval).toString());
    const headerStart = BigNumber.from(headerBlock.start);
    const headerEnd = BigNumber.from(headerBlock.end);

    if (headerStart.lte(childBlockNumber) && childBlockNumber.lte(headerEnd)) {
      // if childBlockNumber is between the upper and lower bounds of the headerBlock, we found our answer
      ans = mid;
      break;
    } else if (headerStart.gt(childBlockNumber)) {
      // childBlockNumber was checkpointed before this header
      end = mid.sub(1);
    } else if (headerEnd.lt(childBlockNumber)) {
      // childBlockNumber was checkpointed after this header
      start = mid.add(1);
    }
  }
  return ans.mul(checkpointIdInterval);
};

/**
 * Searches for checkpoint of a particular childChain block on rootChainManager contract using binary search
 * @param rootChainProvider        Ethers provider object for querying the rootChainManager contract
 * @param rootChainContractAddress Address of the rootChainManager contract
 * @param blockNumber              Blocknumber on the matic chain of which we are searching for the checkpoint of
 * @returns A tuple of the id of the checkpoint object which contains the specified block and it's contents
 */
export const findBlockCheckpoint = async (
  rootChainProvider: Provider,
  rootChainContractAddress: string,
  blockNumber: BigNumberish,
): Promise<[BigNumber, HeaderBlockCheckpoint]> => {
  const rootChainContract = new Contract(rootChainContractAddress, rootChainABI, rootChainProvider);
  const checkpointManagerAddress = await rootChainContract.checkpointManagerAddress();
  const checkpointManagerContract = new Contract(checkpointManagerAddress, checkpointManagerABI, rootChainProvider);

  const headerBlockNumber = await findHeaderBlockNumber(checkpointManagerContract, blockNumber);
  const headerBlock = await checkpointManagerContract.headerBlocks(headerBlockNumber.toString());
  return [headerBlockNumber, headerBlock];
};
