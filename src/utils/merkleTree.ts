import { keccak256 as solidityKeccak256 } from "@ethersproject/solidity";
import { HashZero } from "@ethersproject/constants";

class MerkleTree {
  private leaves: string[];

  private layers: string[][];

  constructor(leaves: string[] = []) {
    if (leaves.length < 1) {
      throw new Error("At least 1 leaf needed");
    }

    const depth = Math.ceil(Math.log(leaves.length) / Math.log(2));
    if (depth > 20) {
      throw new Error("Depth must be 20 or less");
    }

    this.leaves = leaves.concat(Array.from(Array(2 ** depth - leaves.length), () => HashZero));
    this.layers = [this.leaves];
    this.createHashes(this.leaves);
  }

  private createHashes(nodes: string[]): boolean {
    if (nodes.length === 1) {
      // Reached the top of the tree
      return true;
    }

    const treeLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1];
      treeLevel.push(solidityKeccak256(["bytes32", "bytes32"], [left, right]));
    }

    // is odd number of nodes
    if (nodes.length % 2 === 1) {
      treeLevel.push(nodes[nodes.length - 1]);
    }

    this.layers.push(treeLevel);
    return this.createHashes(treeLevel);
  }

  getLeaves(): string[] {
    return this.leaves;
  }

  getLayers(): string[][] {
    return this.layers;
  }

  getRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(leaf: string): string[] {
    let index = -1;
    for (let i = 0; i < this.leaves.length; i += 1) {
      if (leaf === this.leaves[i]) {
        index = i;
      }
    }
    if (index === -1) {
      throw new Error("Could not find element in tree");
    }

    const proof = [];
    if (index <= this.getLeaves().length) {
      let siblingIndex;
      for (let i = 0; i < this.layers.length - 1; i += 1) {
        if (index % 2 === 0) {
          siblingIndex = index + 1;
        } else {
          siblingIndex = index - 1;
        }
        index = Math.floor(index / 2);
        proof.push(this.layers[i][siblingIndex]);
      }
    }
    return proof;
  }

  static verify(value: string, index: number, root: string, proof: string[]): boolean {
    if (!Array.isArray(proof) || !value || !root) {
      return false;
    }

    let hash = value;
    let currentIndex = index;
    for (let i = 0; i < proof.length; i += 1) {
      const node = proof[i];
      if (currentIndex % 2 === 0) {
        hash = solidityKeccak256(["bytes32", "bytes32"], [hash, node]);
      } else {
        hash = solidityKeccak256(["bytes32", "bytes32"], [node, hash]);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return hash === root;
  }
}

export default MerkleTree;
