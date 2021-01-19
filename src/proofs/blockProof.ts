import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import BN from "bn.js";
import { map } from "bluebird";
import { toBuffer, keccak256 } from "ethereumjs-util";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import MerkleTree from "../utils/merkleTree";
import { getFullBlockByNumber } from "../utils/blocks";
import { BlockProof, HeaderBlockCheckpoint, RequiredBlockMembers } from "../types";
import { findBlockCheckpointId } from "../utils/checkpoint";
import { isBlockCheckpointed } from "../checks";
import { getCheckpointManager } from "../utils/contracts";

const getBlockHeader = (block: RequiredBlockMembers): Buffer => {
  const n = new BN(BigNumber.from(block.number).toString()).toArrayLike(Buffer, "be", 32);
  const ts = new BN(BigNumber.from(block.timestamp).toString()).toArrayLike(Buffer, "be", 32);
  const txRoot = toBuffer(block.transactionsRoot);
  const receiptsRoot = toBuffer(block.receiptsRoot);
  return keccak256(Buffer.concat([n, ts, txRoot, receiptsRoot]));
};

const getMerkleTreeBlocks = async (
  maticChainProvider: JsonRpcProvider,
  start: number,
  end: number,
): Promise<RequiredBlockMembers[]> => {
  const blocks = new Array(end - start + 1);
  await map(
    blocks,
    async (_, index: number) => {
      blocks[index] = await getFullBlockByNumber(maticChainProvider, start + index);
    },
    { concurrency: 10 },
  );

  return blocks;
};

const buildMerkleProof = async (
  burnTxBlock: RequiredBlockMembers,
  blocks: RequiredBlockMembers[],
  checkpointId: BigNumber,
) => {
  const blockProof = new MerkleTree(blocks.map(getBlockHeader)).getProof(getBlockHeader(burnTxBlock));

  return {
    burnTxBlockNumber: BigNumber.from(burnTxBlock.number).toNumber(),
    burnTxBlockTimestamp: BigNumber.from(burnTxBlock.timestamp).toNumber(),
    transactionsRoot: Buffer.from(burnTxBlock.transactionsRoot.slice(2), "hex"),
    receiptsRoot: Buffer.from(burnTxBlock.receiptsRoot.slice(2), "hex"),
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
  const endBlock = BigNumber.from(checkpoint.start).toNumber();

  // Build proof that block containing burnTx is included in Matic chain.
  // Proves that a block with the stated blocknumber has been included in a checkpoint
  const blocks = await getMerkleTreeBlocks(maticChainProvider, startBlock, endBlock);
  const burnTxBlock = blocks[BigNumber.from(blockNumber).sub(startBlock).toNumber()];
  return buildMerkleProof(burnTxBlock, blocks, checkpointId);
};
