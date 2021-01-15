import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiBN from "chai-bn";
import BN from "bn.js";
import { bufferToHex } from "ethereumjs-util";

import { JsonRpcProvider } from "@ethersproject/providers";
import { childRPC, erc20TransferEventSig, mockValues, rootRPC } from "./helpers/constants";
import { assertBigNumberEquality } from './helpers/utils';

import { buildPayloadForExit, encodePayload } from "../lib/index";
// Enable and inject BN dependency
chai.use(chaiAsPromised).use(chaiBN(BN)).should();


contract("RootChainManager", async accounts => {
    it("Should match checkpoint", async () => {
      const payload = await buildPayloadForExit(
        new JsonRpcProvider(rootRPC),
        new JsonRpcProvider(childRPC),
        contracts.root.rootChainManager.address,
        withdrawTx.tx,
        erc20TransferEventSig,
      );

      assertBigNumberEquality(payload.headerBlockNumber, headerNumber)
      assertBigNumberEquality(payload.burnTxBlockNumber, checkpointData.number)
      assertBigNumberEquality(payload.burnTxBlockTimestamp, checkpointData.timestamp)
      bufferToHex(payload.transactionsRoot).should.equal(bufferToHex(checkpointData.transactionsRoot))
      bufferToHex(payload.receiptsRoot).should.equal(bufferToHex(checkpointData.receiptsRoot))
      bufferToHex(payload.receipt).should.equal(bufferToHex(checkpointData.receipt))
            // payload.receiptProofParentNodes.should.equal(checkpointData.receiptParentNodes)
      bufferToHex(payload.receiptProofPath).should.equal(bufferToHex(checkpointData.path))
      assertBigNumberEquality(payload.logIndex,1)
    });
  });
});
