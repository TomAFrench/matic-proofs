import { HashZero } from "@ethersproject/constants";
import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";
import { JsonRpcProvider } from "@ethersproject/providers";
import MerkleTree from "./merkleTree";

const queryRootHash = async (maticProvider: JsonRpcProvider, startBlock: number, endBlock: number): Promise<string> =>
  `0x${await maticProvider.send("eth_getRootHash", [startBlock, endBlock])}`;

const recursiveZeroHash = (n: number): string => {
  if (n === 0) return HashZero;
  const subHash = recursiveZeroHash(n - 1);
  return solidityKeccak256(["bytes32", "bytes32"], [subHash, subHash]);
};

/**
 * Function to quickly calculate a merkle proof of block inclusion in a checkpoint
 * Makes use of the `eth_getRootHash` method on Matic nodes to reduce number of requests
 * @dev Starts from the top of the merkle tree and determines which subtree the leaf of interest is in.
 *      The root hash of the other subtree is then requested and the process repeats on the new root node
 *
 *      When pulling merkle roots on the right side of the tree, care must be taken to ensure that the proper padding
 *      with zero leaves is performed as the Matic node does not know that this is part of a subtree
 * @param maticProvider - the provider from which to query merkle roots
 * @param blockNumber - the blocknumber of the block for which to generate a merkle proof
 * @param startBlock - the blocknumber of the first block in the checkpoint
 * @param endBlock - the blocknumber of the last block in the checkpoint
 */
export const getFastMerkleProof = async (
  maticProvider: JsonRpcProvider,
  blockNumber: number,
  startBlock: number,
  endBlock: number,
): Promise<string[]> => {
  const merkleTreeDepth = Math.ceil(Math.log2(endBlock - startBlock + 1));

  // We generate the proof root down, whereas we need from leaf up
  const reversedProof: string[] = [];

  const offset = startBlock;
  const targetIndex = blockNumber - offset;
  let leftBound = 0;
  let rightBound = endBlock - offset;
  for (let depth = 0; depth < merkleTreeDepth; depth += 1) {
    /* eslint-disable no-await-in-loop */

    // The pivot leaf is the last leaf which is included in the left subtree
    const pivotLeaf = leftBound + 2 ** (merkleTreeDepth - depth - 1) - 1;

    if (targetIndex > pivotLeaf) {
      // Get the root hash to the merkle subtree to the left
      const newLeftBound = pivotLeaf + 1;
      const subTreeMerkleRoot = await queryRootHash(maticProvider, offset + leftBound, offset + pivotLeaf);
      reversedProof.push(subTreeMerkleRoot);
      leftBound = newLeftBound;
    } else {
      // Things are more complex when querying to the right.
      // Root hash may come some layers down so we need to build a full tree by padding with zeros
      // Some trees may be completely empty

      const newRightBound = Math.min(rightBound, pivotLeaf);

      // Expect the merkle tree to have a height one less than the current layer
      const expectedHeight = merkleTreeDepth - (depth + 1);
      if (rightBound <= pivotLeaf) {
        // Tree is empty so we repeatedly hash zero to correct height
        const subTreeMerkleRoot = recursiveZeroHash(expectedHeight);
        reversedProof.push(subTreeMerkleRoot);
      } else {
        // Height of tree given by RPC node
        const subTreeHeight = Math.ceil(Math.log2(rightBound - pivotLeaf));

        // Find the difference in height between this and the subtree we want
        const heightDifference = expectedHeight - subTreeHeight;

        // For every extra layer we need to fill 2*n leaves filled with the merkle root of a zero-filled Merkle tree
        // We need to build a tree which has heightDifference layers

        // The first leaf will hold the root hash as returned by the RPC
        const remainingNodesHash = await queryRootHash(maticProvider, offset + pivotLeaf + 1, offset + rightBound);

        // The remaining leaves will hold the merkle root of a zero-filled tree of height subTreeHeight
        const leafRoots = recursiveZeroHash(subTreeHeight);

        // Build a merkle tree of correct size for the subtree using these merkle roots
        const leaves = Array.from({ length: 2 ** heightDifference }, () => leafRoots);
        leaves[0] = remainingNodesHash;

        const subTreeMerkleRoot = new MerkleTree(leaves).getRoot();
        reversedProof.push(subTreeMerkleRoot);
      }
      rightBound = newRightBound;
    }
  }

  return reversedProof.reverse();
};
