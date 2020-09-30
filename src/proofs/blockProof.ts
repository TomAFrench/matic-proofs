import { JsonRpcProvider } from "@ethersproject/providers";
import BN from "bn.js";

import { toBuffer, keccak256, bufferToHex } from "ethereumjs-util";
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
  const headers = await Promise.all(
    Array.from({ length: end - start + 1 }, async (_, index: number) =>
      getBlockHeader(await getFullBlockByNumber(maticChainProvider, start + index)),
    ),
  );
  return new MerkleTree(headers);
};

export const buildBlockProof = async (
  maticChainProvider: JsonRpcProvider,
  start: number,
  end: number,
  blockNumber: number,
): Promise<string> => {
  console.log("building tree", start, end, blockNumber);
  const tree = await buildBlockHeaderMerkle(maticChainProvider, start, end);
  const blockHeader = getBlockHeader(await getFullBlockByNumber(maticChainProvider, blockNumber));
  const proof = tree.getProof(blockHeader);
  return bufferToHex(Buffer.concat(proof));
};
