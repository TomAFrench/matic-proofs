import { JsonRpcProvider, Provider } from "@ethersproject/providers";
import BN from "bn.js";
import { map } from "bluebird";
import { toBuffer, keccak256 } from "ethereumjs-util";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import MerkleTree from "../utils/merkleTree";
import { getFullBlockByNumber } from "../utils/blocks";
import { BlockProof, RequiredBlockMembers } from "../types";
import { findBlockCheckpoint } from "../utils/checkpoint";
import { isBlockCheckpointed } from "../checks";

const getBlockHeader = (block: RequiredBlockMembers): Buffer => {
  const n = new BN(BigNumber.from(block.number).toString()).toArrayLike(Buffer, "be", 32);
  const ts = new BN(BigNumber.from(block.timestamp).toString()).toArrayLike(Buffer, "be", 32);
  const txRoot = toBuffer(block.transactionsRoot);
  const receiptsRoot = toBuffer(block.receiptsRoot);
  return keccak256(Buffer.concat([n, ts, txRoot, receiptsRoot]));
};

const buildBlockHeaderMerkle = async (maticChainProvider: JsonRpcProvider, start: number, end: number) => {
  const headers = new Array(end - start + 1);
  await map(
    headers,
    // eslint-disable-next-line
    async (_, index: number) => {
      headers[index] = getBlockHeader(await getFullBlockByNumber(maticChainProvider, start + index));
    },
    { concurrency: 10 },
  );

  return new MerkleTree(headers);
};

const blockHeaderMerkleProof = async (
  maticChainProvider: JsonRpcProvider,
  start: number,
  end: number,
  blockNumber: number,
): Promise<Buffer[]> => {
  const tree = await buildBlockHeaderMerkle(maticChainProvider, start, end);
  const burnTxBlock = await getFullBlockByNumber(maticChainProvider, blockNumber);
  const blockHeader = getBlockHeader(burnTxBlock);
  const proof = tree.getProof(blockHeader);
  return proof;
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

  const [checkpointId, checkpoint] = await findBlockCheckpoint(
    rootChainProvider,
    rootChainContractAddress,
    blockNumber,
  );

  // Build proof that block containing burnTx is included in Matic chain.
  // Proves that a block with the stated blocknumber has been included in a checkpoint
  const blockProof = await blockHeaderMerkleProof(
    maticChainProvider,
    BigNumber.from(checkpoint.start).toNumber(),
    BigNumber.from(checkpoint.end).toNumber(),
    BigNumber.from(blockNumber).toNumber(),
  );

  const block = await getFullBlockByNumber(maticChainProvider, blockNumber);

  return {
    burnTxBlockNumber: BigNumber.from(blockNumber).toNumber(),
    burnTxBlockTimestamp: BigNumber.from(block.timestamp).toNumber(),
    transactionsRoot: Buffer.from(block.transactionsRoot.slice(2), "hex"),
    receiptsRoot: Buffer.from(block.receiptsRoot.slice(2), "hex"),
    headerBlockNumber: checkpointId.toNumber(),
    blockProof,
  };
};
