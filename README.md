# Matic Proofs Generator

Library to construct Proof of Burn manually using the burn transaction hash. Currently in MaticJs, this is not possible.
It also includes the necessary helper functions to determine whether a withdrawal is ready to be claimed or has already been claimed.

For moving tokens from L2 > L1 (Matic > Ethereum), the tokens are burned on the Matic network by calling the native withdraw() function in any token contracts. Then the burn transaction hash has to be included to the matic checkpoint by the validators. Once the block has been included by the validators, we can generate the "Proof of Burn" by using the burn transaction hash on L2. Then the proof has to be submitted to the RootChainProxy to get the tokens to the same address on L1.

During the movement of tokens from L2 > L1, we cannot send the tokens to the address of our choice. So anyone can verify the proof of burn irrespective of the sender.

### Why should I generate these proofs manually ?

If you're developing a smart contract on L1 that receives funds from another smart contract from L2, then at some point you've to generate the proofs off-chain and include them on-chain. For the purpose of acheiveing L2 > L1 communication between smart contract & transferrring tokens between them we need to have the ability to generate the proofs manually.

### Built with

- [Hardhat](https://hardhat.org/) - Smart Contract Development Suite
- [Ethers](https://docs.ethers.io/v5/getting-started/) - Web3 Library
- [Prettier](https://github.com/prettier-solidity/prettier-plugin-solidity) - Automatic Code Formatting
- [Solidity](https://docs.soliditylang.org/en/v0.8.6/) - Smart Contract Programming Language
- [Merkle Patricia Tree](https://www.npmjs.com/package/merkle-patricia-tree) - Ethereum Data Structure Library

### Prerequisites

The repository is built using hardhat. So it is recommended to install hardhat globally through npm or yarn using the following commands.

`sudo npm i -g hardhat`

### Installation

You can install using npm (or) yarn

```console
$ npm i @tomfrench/matic-proofs
```

(or)

```console
$ yarn install @tomfrench/matic-proofs
```

### Usage

Once installed, you can use the contracts in the library by importing them:

```js
import {ethers} from "ethers";
import {
    buildPayloadForExit,
    encodePayload,
    EventSignature
} from "@tomfrench/matic-proofs";

let eth_provider = new ethers.providers.InfuraProvider(
    'goerli', '<YOUR INFURA KEY>'
);

let matic_provider = new ethers.providers.JsonRpcProvider('https://matic-mumbai.chainstacklabs.com');

const txHash = "<YOUR TX HASH>"; // Burn Tx Hash
const RootChainManager = "0xBbD7cBFA79faee899Eaf900F13C9065bF03B1A74"; // For Mainnet use: 0x86E4Dc95c7FBdBf52e33D563BbDB00823894C287

// Generating the proof
const proof = await buildPayloadForExit(eth_provider, matic_provider, , txHash, EventSignature.ERC20Transfer);

// Encoding the proof (RLP Encoding)
const encodedPayload = await encodePayload(proof);

// Use this Proof to Claim Tokens
console.log(encodedPayload);
```

### Additional Info

Full list of smart contract can be found at:
[Testnet](https://static.matic.network/network/testnet/mumbai/index.json) - Mumbai & Goerli Contracts
[Mainnet](https://static.matic.network/network/mainnet/v1/index.json) - Polygon & Ethereum Mainnet Contracts

All updates to the RootChain, ERC20Predicate can be found on the above links.

## Setting up Local Repository

Clone the Repository using the following command

```bash
git clone https://github.com/TomAFrench/matic-proofs
```

Install all dependencies

```bash
yarn install
```

### Testing

For running unit & integration tests, run the following command

```bash
yarn test
```

### License

This Library is released under the MIT License.
