import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";
import MerkleTree from "../utils/merkleTree";
import { BlockProof, HeaderBlockCheckpoint, RequiredBlockMembers } from "../types";
import { findBlockCheckpointId } from "../utils/checkpoint";
import { isBlockCheckpointed } from "../checks";
import { getCheckpointManager } from "../utils/contracts";
import { getBlocksInRange } from "../utils/blocks";

export const getBlockHeader = (block: RequiredBlockMembers): string =>
  solidityKeccak256(
    ["uint256", "uint256", "bytes32", "bytes32"],
    [block.number, block.timestamp, block.transactionsRoot, block.receiptsRoot],
  );

export const buildMerkleProof = async (
  burnTxBlock: RequiredBlockMembers,
  blocks: RequiredBlockMembers[],
  checkpointId: BigNumber,
): Promise<BlockProof> => {
  const blockProof = new MerkleTree(blocks.map(getBlockHeader)).getProof(getBlockHeader(burnTxBlock));

  return {
    burnTxBlockNumber: BigNumber.from(burnTxBlock.number).toNumber(),
    burnTxBlockTimestamp: BigNumber.from(burnTxBlock.timestamp).toNumber(),
    transactionsRoot: burnTxBlock.transactionsRoot,
    receiptsRoot: burnTxBlock.receiptsRoot,
    headerBlockNumber: checkpointId.toNumber(),
    blockProof,
  };
};

export const buildBlockProof = async (
  rootChainProvider: Provider,
  maticChainProvider: JsonRpcProvider,
  rootChainContractAddress: string,
  blockNumber: BigNumberish,
): Promise<BlockProof> => {
  // Check that the block containing is checkpointed on mainnet.
  if (!isBlockCheckpointed(rootChainProvider, rootChainContractAddress, blockNumber)) {
    throw new Error("Block has not been checkpointed yet");
  }

  const checkpointManager = await getCheckpointManager(rootChainProvider, rootChainContractAddress);
  const checkpointId = await findBlockCheckpointId(checkpointManager, blockNumber);

  // Pull out the blocks which need to be downloaded to build merkle proof
  const checkpoint: HeaderBlockCheckpoint = await checkpointManager.headerBlocks(checkpointId.toString());
  const startBlock = BigNumber.from(checkpoint.start).toNumber();
  const endBlock = BigNumber.from(checkpoint.end).toNumber();

  // Build proof that block containing burnTx is included in Matic chain.
  // Proves that a block with the stated blocknumber has been included in a checkpoint
  const blocks = await getBlocksInRange(maticChainProvider, startBlock, endBlock);
  const burnTxBlock = blocks[BigNumber.from(blockNumber).sub(startBlock).toNumber()];
  return buildMerkleProof(burnTxBlock, blocks, checkpointId);
};
