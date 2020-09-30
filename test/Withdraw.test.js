import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiBN from "chai-bn";
import BN from "bn.js";
import { defaultAbiCoder as abi } from "@ethersproject/abi";
import { bufferToHex, rlp } from "ethereumjs-util";

import { JsonRpcProvider } from "@ethersproject/providers";
import * as deployer from "./helpers/deployer";
import { childRPC, erc20TransferEventSig, mockValues, rootRPC } from "./helpers/constants";
import { childWeb3 } from "./helpers/contracts";
import logDecoder from "./helpers/log-decoder";
import { submitCheckpoint } from "./helpers/checkpoint";

import { buildPayloadForExit, encodePayload } from "../lib/index";
// Enable and inject BN dependency
chai.use(chaiAsPromised).use(chaiBN(BN)).should();

const should = chai.should();

const STATE_SYNCED_EVENT_SIG = "0x103fed9db65eac19c4d870f49ab7520fe03b99f1838e5996caf47e9e43308392";

const syncState = async ({ tx, contracts }) => {
  const evt = tx.receipt.rawLogs.find(l => l.topics[0] === STATE_SYNCED_EVENT_SIG);
  const [syncData] = abi.decode(["bytes"], evt.data);
  const syncId = evt.topics[1];
  const stateReceiveTx = await contracts.child.childChainManager.onStateReceive(syncId, syncData);
  return stateReceiveTx;
};

contract("RootChainManager", async accounts => {
  describe("Withdraw ERC20", async () => {
    const depositAmount = mockValues.amounts[1];
    let totalDepositedAmount = new BN("0");
    const withdrawAmount = mockValues.amounts[1];
    const depositReceiver = accounts[0];
    const depositData = abi.encode(["uint256"], [depositAmount.toString()]);
    let contracts;
    let dummyERC20;
    let rootChainManager;
    let accountBalance;
    let contractBalance;
    let transferLog;
    let withdrawTx;
    let checkpointData;
    let headerNumber;
    let exitTx;

    before(async () => {
      contracts = await deployer.deployInitializedContracts(accounts);
      dummyERC20 = contracts.root.dummyERC20;
      rootChainManager = contracts.root.rootChainManager;
      accountBalance = await dummyERC20.balanceOf(accounts[0]);
      contractBalance = await dummyERC20.balanceOf(contracts.root.erc20Predicate.address);
    });

    it("Depositor should be able to approve and deposit", async () => {
      await dummyERC20.approve(contracts.root.erc20Predicate.address, depositAmount);
      const depositTx = await rootChainManager.depositFor(depositReceiver, dummyERC20.address, depositData);
      should.exist(depositTx);
      totalDepositedAmount = totalDepositedAmount.add(depositAmount);
      const syncTx = await syncState({ tx: depositTx, contracts });
      should.exist(syncTx);
    });

    it("Second depositor should be able to approve and deposit", async () => {
      await dummyERC20.mint(depositAmount);
      await dummyERC20.transfer(accounts[2], depositAmount);
      await dummyERC20.approve(contracts.root.erc20Predicate.address, mockValues.amounts[2], { from: accounts[2] });
      const depositTx = await rootChainManager.depositFor(accounts[2], dummyERC20.address, depositData, {
        from: accounts[2],
      });
      should.exist(depositTx);
      totalDepositedAmount = totalDepositedAmount.add(depositAmount);
      const syncTx = await syncState({ tx: depositTx, contracts });
      should.exist(syncTx);
    });

    it("Deposit amount should be deducted from depositor account", async () => {
      const newAccountBalance = await dummyERC20.balanceOf(accounts[0]);
      newAccountBalance.should.be.a.bignumber.that.equals(accountBalance.sub(depositAmount));
      // update account balance
      accountBalance = newAccountBalance;
    });

    it("Deposit amount should be credited to correct contract", async () => {
      const newContractBalance = await dummyERC20.balanceOf(contracts.root.erc20Predicate.address);
      newContractBalance.should.be.a.bignumber.that.equals(contractBalance.add(totalDepositedAmount));

      // update balance
      contractBalance = newContractBalance;
    });

    it("Can receive withdraw tx", async () => {
      withdrawTx = await contracts.child.dummyERC20.withdraw(withdrawAmount, { from: depositReceiver });
      should.exist(withdrawTx);
    });

    it("Should emit Transfer log in withdraw tx", () => {
      const logs = logDecoder.decodeLogs(withdrawTx.receipt.rawLogs);
      transferLog = logs.find(l => l.event === "Transfer");
      should.exist(transferLog);
    });

    it("Should submit checkpoint", async () => {
      // submit checkpoint including burn (withdraw) tx
      checkpointData = await submitCheckpoint(contracts.root.checkpointManager, withdrawTx.receipt);
      should.exist(checkpointData);
    });

    it("Should match checkpoint details", async () => {
      const root = bufferToHex(checkpointData.header.root);
      should.exist(root);

      // fetch latest header number
      headerNumber = await contracts.root.checkpointManager.currentCheckpointNumber();
      headerNumber.should.be.bignumber.gt("0");

      // fetch header block details and validate
      const headerData = await contracts.root.checkpointManager.headerBlocks(headerNumber);
      root.should.equal(headerData.root);
    });

    // it("Should start exit using checkpoint", async () => {
    //   const logIndex = 0;
    //   const data = bufferToHex(
    //     rlp.encode([
    //       headerNumber,
    //       bufferToHex(Buffer.concat(checkpointData.proof)),
    //       checkpointData.number,
    //       checkpointData.timestamp,
    //       bufferToHex(checkpointData.transactionsRoot),
    //       bufferToHex(checkpointData.receiptsRoot),
    //       bufferToHex(checkpointData.receipt),
    //       bufferToHex(rlp.encode(checkpointData.receiptParentNodes)),
    //       bufferToHex(checkpointData.path), // branch mask,
    //       logIndex,
    //     ]),
    //   );
    //   // start exit
    //   exitTx = await contracts.root.rootChainManager.exit(data, { from: depositReceiver });
    //   should.exist(exitTx);
    // });

    it("Should start exit using sdk", async () => {
      const payload = await buildPayloadForExit(
        new JsonRpcProvider(rootRPC),
        new JsonRpcProvider(childRPC),
        contracts.root.rootChainManager.address,
        withdrawTx.tx,
        erc20TransferEventSig,
      );
      console.log("payload", payload);
      const data = encodePayload(payload);
      console.log("encoded data", data);
      // start exit
      exitTx = await contracts.root.rootChainManager.exit(data, { from: depositReceiver });
      should.exist(exitTx);
    });

    it("Should emit Transfer log in exit tx", () => {
      const logs = logDecoder.decodeLogs(exitTx.receipt.rawLogs);
      const exitTransferLog = logs.find(l => l.event === "Transfer");
      should.exist(exitTransferLog);
    });

    it("Should have more amount in withdrawer account after withdraw", async () => {
      const newAccountBalance = await dummyERC20.balanceOf(depositReceiver);
      newAccountBalance.should.be.a.bignumber.that.equals(accountBalance.add(depositAmount));
    });

    it("Should have less amount in predicate contract after withdraw", async () => {
      const newContractBalance = await dummyERC20.balanceOf(contracts.root.erc20Predicate.address);
      newContractBalance.should.be.a.bignumber.that.equals(contractBalance.sub(withdrawAmount));
    });
  });
});
