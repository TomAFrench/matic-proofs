import fetch from "isomorphic-fetch";
import { Contract } from "@ethersproject/contracts";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";

const checkBlockInCheckpoint = async (
  checkpointManager: Contract,
  targetBlockNumber: BigNumber,
  checkpointId: BigNumber,
) => {
  const headerBlock = await checkpointManager.headerBlocks(checkpointId);
  const headerStart = BigNumber.from(headerBlock.start);
  const headerEnd = BigNumber.from(headerBlock.end);

  if (headerStart.gt(targetBlockNumber)) {
    // targetBlockNumber was checkpointed before this headerBlock
    return -1;
  }
  if (headerEnd.lt(targetBlockNumber)) {
    // targetBlockNumber was checkpointed after this headerBlock
    return 1;
  }
  // targetBlockNumber is between the upper and lower bounds of the headerBlock, we found our answer
  return 0;
};

/**
 * Searches for checkpoint of a particular childChain block on rootChainManager contract using binary search
 * @param checkpointManager        Ethers contract object for CheckpointManager contract
 * @param blockNumber              Blocknumber on the matic chain of which we are searching for the checkpoint of
 * @returns A BigNumber containing the id of the checkpoint which contains the specified block
 */
export const fallbackFindBlockCheckpointId = async (
  checkpointManager: Contract,
  childBlockNumber: BigNumberish,
  checkpointIdInterval: BigNumberish = BigNumber.from(10000),
): Promise<BigNumber> => {
  // eslint-disable-next-line no-param-reassign
  childBlockNumber = BigNumber.from(childBlockNumber);
  // first checkpoint id = start * 10000
  let start = BigNumber.from(1);

  // Shortcut: If block is newer than last checkpoint of 2020 then bring forward start to then
  // Shaves off a couple of seconds for recent withdrawals
  if (childBlockNumber.gte(9010326)) {
    start = BigNumber.from(91490000).div(checkpointIdInterval);
  }

  // last checkpoint id = end * 10000
  const latestCheckpointId = await checkpointManager.currentHeaderBlock();
  let end = BigNumber.from(latestCheckpointId).div(checkpointIdInterval);
  if (start.gt(end)) {
    throw new Error("start block is greater than end block");
  }

  // binary search on all the checkpoints to find the checkpoint that contains the childBlockNumber
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (start.eq(end)) {
      return start.mul(checkpointIdInterval);
    }
    const mid = start.add(end).div(2);

    // eslint-disable-next-line no-await-in-loop
    const checkpointStatus = await checkBlockInCheckpoint(
      checkpointManager,
      childBlockNumber,
      mid.mul(checkpointIdInterval),
    );

    switch (checkpointStatus) {
      case 0:
        // childBlockNumber is in this checkpoint, we found our answer
        return mid.mul(checkpointIdInterval);
      case -1:
        // childBlockNumber was checkpointed before this checkpoint
        end = mid.sub(1);
        break;
      case 1:
        // childBlockNumber was checkpointed after this checkpoint
        start = mid.add(1);
        break;
      default:
        throw new Error("Error finding correct checkpoint ID");
    }
  }
};

export const subgraphGetCheckpoint = async (
  blockNumber: number,
): Promise<{ checkpointId: number; start: number; end: number }> => {
  const query = `
    query ($blockNumber: Int!) {
      newHeaderBlockEntities(where: {start_lte: $blockNumber, end_gte: $blockNumber}) {
        headerBlockId
        start
        end
      }
    }
  `;

  const variables = {
    blockNumber,
  };

  const subgraphURL = "https://api.thegraph.com/subgraphs/name/nglglhtr/maticnetwork-mainnet";
  const response = await fetch(subgraphURL, {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw Error(response.statusText);
  }
  const { data, errors } = await response.json();

  if (errors) {
    throw new Error(errors[0].message);
  }
  const headerData = data.newHeaderBlockEntities[0];

  return {
    checkpointId: parseInt(headerData.headerBlockId, 10),
    start: parseInt(headerData.start, 10),
    end: parseInt(headerData.end, 10),
  };
};

export const findBlockCheckpointId = async (
  checkpointManager: Contract,
  childBlockNumber: BigNumber,
  checkpointIdInterval: BigNumberish = BigNumber.from(10000),
): Promise<BigNumber> => {
  try {
    const { checkpointId } = await subgraphGetCheckpoint(childBlockNumber.toNumber());
    return BigNumber.from(checkpointId);
  } catch {
    console.log("using fallback");
    return fallbackFindBlockCheckpointId(checkpointManager, childBlockNumber, checkpointIdInterval);
  }
};
