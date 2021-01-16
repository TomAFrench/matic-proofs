import { keccak256, zeros } from "ethereumjs-util";

class MerkleTree {
  private leaves: Buffer[];

  private layers: Buffer[][];

  constructor(leaves: Buffer[] = []) {
    if (leaves.length < 1) {
      throw new Error("At least 1 leaf needed");
    }

    const depth = Math.ceil(Math.log(leaves.length) / Math.log(2));
    if (depth > 20) {
      throw new Error("Depth must be 20 or less");
    }

    this.leaves = leaves.concat(Array.from(Array(2 ** depth - leaves.length), () => zeros(32)));
    this.layers = [this.leaves];
    this.createHashes(this.leaves);
  }

  private createHashes(nodes: Buffer[]): boolean {
    if (nodes.length === 1) {
      // Reached the top of the tree
      return true;
    }

    const treeLevel = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1];
      const data = Buffer.concat([left, right]);
      treeLevel.push(keccak256(data));
    }

    // is odd number of nodes
    if (nodes.length % 2 === 1) {
      treeLevel.push(nodes[nodes.length - 1]);
    }

    this.layers.push(treeLevel);
    return this.createHashes(treeLevel);
  }

  getLeaves(): Buffer[] {
    return this.leaves;
  }

  getLayers(): Buffer[][] {
    return this.layers;
  }

  getRoot(): Buffer {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(leaf: Buffer): Buffer[] {
    let index = -1;
    for (let i = 0; i < this.leaves.length; i += 1) {
      if (Buffer.compare(leaf, this.leaves[i]) === 0) {
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

  // eslint-disable-next-line class-methods-use-this
  verify(value: any, index: number, root: any, proof: string | any[]): boolean {
    if (!Array.isArray(proof) || !value || !root) {
      return false;
    }

    let hash = value;
    let currentIndex = index;
    for (let i = 0; i < proof.length; i += 1) {
      const node = proof[i];
      if (currentIndex % 2 === 0) {
        hash = keccak256(Buffer.concat([hash, node]));
      } else {
        hash = keccak256(Buffer.concat([node, hash]));
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return Buffer.compare(hash, root) === 0;
  }
}

export default MerkleTree;
