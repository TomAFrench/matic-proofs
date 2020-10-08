import { JsonRpcProvider } from "@ethersproject/providers";
import BN from "bn.js";
import { map } from "bluebird";
import { toBuffer, keccak256 } from "ethereumjs-util";
import { BigNumber } from "@ethersproject/bignumber";
import MerkleTree from "../utils/merkleTree";
import { getFullBlockByNumber } from "../utils/blocks";
import { RequiredBlockMembers } from "../types";

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
    { concurrency: 20 },
  );

  // const blocks = await Promise.all(
  //   Array.from({ length: end - start + 1 }, async (_, index: number) =>
  //     getFullBlockByNumber(maticChainProvider, start + index),
  //   ),
  // );
  // const headers = blocks.map(block => getBlockHeader(block));
  return new MerkleTree(headers);
};

export const buildBlockProof = async (
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
