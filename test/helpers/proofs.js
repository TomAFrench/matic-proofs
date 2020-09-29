import { BaseTrie as Trie } from "merkle-patricia-tree";
import { rlp, keccak256, toBuffer } from "ethereumjs-util";
import { Transaction } from "ethereumjs-tx";
import Common from "ethereumjs-common";
import EthereumBlock from "ethereumjs-block/from-rpc";

// raw header
function getRawHeader(_block) {
  if (typeof _block.difficulty !== "string") {
    _block.difficulty = `0x${_block.difficulty.toString(16)}`;
  }

  const block = new EthereumBlock(_block);
  return block.header;
}

// squanch transaction
export function squanchTx(tx) {
  tx.gasPrice = `0x${parseInt(tx.gasPrice).toString(16)}`;
  tx.value = `0x${parseInt(tx.value).toString(16)}` || "0";
  tx.gas = `0x${parseInt(tx.gas).toString(16)}`;
  tx.data = tx.input;
  return tx;
}

function nibblesToTraverse(encodedPartialPath, path, pathPtr) {
  let partialPath;
  if (String(encodedPartialPath[0]) === "0" || String(encodedPartialPath[0]) === "2") {
    partialPath = encodedPartialPath.slice(2);
  } else {
    partialPath = encodedPartialPath.slice(1);
  }

  if (partialPath === path.slice(pathPtr, pathPtr + partialPath.length)) {
    return partialPath.length;
  }
  throw new Error("path was wrong");
}

export function getTxBytes(tx) {
  const txObj = new Transaction(squanchTx(tx), {
    common: Common.forCustomChain("mainnet", { chainId: 15001, name: "bor" }, "byzantium"),
  });
  return txObj.serialize();
}

// build
export async function getTxProof(tx, block) {
  const txTrie = new Trie();
  for (let i = 0; i < block.transactions.length; i += 1) {
    const siblingTx = block.transactions[i];
    const path = rlp.encode(siblingTx.transactionIndex);
    const rawSignedSiblingTx = getTxBytes(siblingTx);
    await txTrie.put(path, rawSignedSiblingTx);
  }

  const { node, remaining, stack } = await txTrie.findPath(rlp.encode(tx.transactionIndex));

  if (node === null || remaining.length > 0) {
    throw new Error("Node does not contain the key");
  }

  return {
    blockHash: toBuffer(tx.blockHash),
    parentNodes: stack.map(trieNode => trieNode.raw()),
    root: getRawHeader(block).transactionsTrie,
    path: rlp.encode(tx.transactionIndex),
    value: rlp.decode(node.value),
  };

  // // promise
  // return new Promise((resolve, reject) => {
  //   txTrie.findPath(rlp.encode(tx.transactionIndex), (err, rawTxNode, reminder, stack) => {
  //     if (err) {
  //       return reject(err);
  //     }

  //     if (reminder.length > 0) {
  //       return reject(new Error("Node does not contain the key"));
  //     }
  //     const prf = {
  //       blockHash: toBuffer(tx.blockHash),
  //       parentNodes: stack.map(s => s.raw),
  //       root: getRawHeader(block).transactionsTrie,
  //       path: rlp.encode(tx.transactionIndex),
  //       value: rlp.decode(rawTxNode.value),
  //     };
  //     resolve(prf);
  //   });
  // });
}

export function verifyTxProof(proof) {
  const path = proof.path.toString("hex");
  const { value } = proof;
  const { parentNodes } = proof;
  const txRoot = proof.root;
  try {
    let currentNode;
    const len = parentNodes.length;
    let nodeKey = txRoot;
    let pathPtr = 0;
    for (let i = 0; i < len; i += 1) {
      currentNode = parentNodes[i];
      const encodedNode = Buffer.from(keccak256(rlp.encode(currentNode)), "hex");
      if (!nodeKey.equals(encodedNode)) {
        return false;
      }
      if (pathPtr > path.length) {
        return false;
      }
      switch (currentNode.length) {
        case 17: // branch node
          if (pathPtr === path.length) {
            if (currentNode[16] === rlp.encode(value)) {
              return true;
            }
            return false;
          }
          nodeKey = currentNode[parseInt(path[pathPtr], 16)]; // must === sha3(rlp.encode(currentNode[path[pathptr]]))
          pathPtr += 1;
          break;
        case 2:
          // eslint-disable-next-line
          const traversed = nibblesToTraverse(
            currentNode[0].toString('hex'),
            path,
            pathPtr,
          );
          if (traversed + pathPtr === path.length) {
            // leaf node
            if (currentNode[1].equals(rlp.encode(value))) {
              return true;
            }
            return false;
          }
          // extension node
          if (traversed === 0) {
            return false;
          }
          pathPtr += traversed;
          nodeKey = currentNode[1];
          break;
        default:
          console.log("all nodes must be length 17 or 2");
          return false;
      }
    }
  } catch (e) {
    console.log(e);
    return false;
  }
  return false;
}

export function getReceiptBytes(receipt) {
  return rlp.encode([
    toBuffer(receipt.status !== undefined && receipt.status != null ? (receipt.status ? "0x1" : "0x") : receipt.root),
    toBuffer(receipt.cumulativeGasUsed),
    toBuffer(receipt.logsBloom),

    // encoded log array
    receipt.logs.map(l =>
      // [address, [topics array], data]
      [
        toBuffer(l.address), // convert address to buffer
        l.topics.map(toBuffer), // convert topics to buffer
        toBuffer(l.data), // convert data to buffer
      ],
    ),
  ]);
}

export function getDiffEncodedReceipt(receipt) {
  return rlp.encode([
    toBuffer(receipt.status !== undefined && receipt.status != null ? (receipt.status ? 1 : 0) : receipt.root),
    toBuffer(receipt.cumulativeGasUsed),
    toBuffer(receipt.logsBloom),

    // encoded log array
    receipt.logs.map(l => {
      // [address, [topics array], data]
      if (l.data.length < 67) {
        // remove left padding
        return [
          toBuffer(l.address), // convert address to buffer
          l.topics.map(toBuffer), // convert topics to buffer
          toBuffer(`0x${l.data.slice(2).replace(/^0+/, "")}`), // convert data to buffer
        ];
      }
      return [
        toBuffer(l.address), // convert address to buffer
        l.topics.map(toBuffer), // convert topics to buffer
        toBuffer(l.data), // convert data to buffer
      ];
    }),
  ]);
}

export function getFakeReceiptBytes(receipt, dummyData) {
  return rlp.encode([
    toBuffer(receipt.status !== undefined && receipt.status != null ? (receipt.status ? 1 : 0) : receipt.root),
    toBuffer(receipt.cumulativeGasUsed),
    toBuffer(receipt.logsBloom),

    // encoded log array
    receipt.logs.map(l => {
      // generate a random data
      const hex = "0123456789abcdef";
      if (dummyData === "") {
        dummyData = "0x";
        for (let i = 0; i < l.data.length; i += 1) {
          dummyData += hex.charAt(Math.floor(Math.random() * hex.length));
        }
      }
      // [address, [topics array], data]
      return [
        toBuffer(l.address), // convert address to buffer
        l.topics.map(toBuffer), // convert topics to buffer
        toBuffer(dummyData), // convert data to buffer
      ];
    }),
  ]);
}

export async function getReceiptProof(receipt, block, web3, receipts) {
  const receiptsTrie = new Trie();
  const receiptPromises = [];
  if (!receipts) {
    block.transactions.forEach(tx => {
      receiptPromises.push(web3.eth.getTransactionReceipt(tx.hash));
    });
    receipts = await Promise.all(receiptPromises);
  }

  for (let i = 0; i < receipts.length; i += 1) {
    const siblingReceipt = receipts[i];
    const path = rlp.encode(siblingReceipt.transactionIndex);
    const rawReceipt = getReceiptBytes(siblingReceipt);
    await receiptsTrie.put(path, rawReceipt);
  }

  const { node, remaining, stack } = await receiptsTrie.findPath(rlp.encode(receipt.transactionIndex));

  if (node === null || remaining.length > 0) {
    throw new Error("Node does not contain the key");
  }

  return {
    blockHash: toBuffer(receipt.blockHash),
    parentNodes: stack.map(trieNode => trieNode.raw()),
    root: getRawHeader(block).receiptTrie,
    path: rlp.encode(receipt.transactionIndex),
    value: rlp.decode(node.value),
  };

  // // promise
  // return new Promise((resolve, reject) => {
  //   receiptsTrie.findPath(rlp.encode(receipt.transactionIndex), (err, rawReceiptNode, reminder, stack) => {
  //     if (err) {
  //       return reject(err);
  //     }

  //     if (reminder.length > 0) {
  //       return reject(new Error("Node does not contain the key"));
  //     }

  //     const prf = {
  //       blockHash: toBuffer(receipt.blockHash),
  //       parentNodes: stack.map(s => s.raw),
  //       root: getRawHeader(block).receiptTrie,
  //       path: rlp.encode(receipt.transactionIndex),
  //       value: rlp.decode(rawReceiptNode.value),
  //     };
  //     resolve(prf);
  //   });
  // });
}

export function verifyReceiptProof(proof) {
  return verifyTxProof(proof, true);
}
