import { TransactionReceipt } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";
import blockList from "./blocks.json";
import receiptList from "./receipts.json";
import { HeaderBlockCheckpoint, RequiredBlockMembers } from "../../src/types";

export const CHECKPOINT_ID = BigNumber.from(96930000);
export const CHECKPOINT: HeaderBlockCheckpoint = {
  root: "0xe459e9f7439f54989ee693ba93802793c02880a824979d476544378d3f66d174",
  start: 9825948,
  end: 9827227,
  createdAt: 1611142592,
  proposer: "0x7fCD58C2D53D980b247F1612FdbA93E9a76193E6",
};

const BURN_HASH = "0xc9238ec69c604ad58d2e9a10fbda778600e7f5900cb52306e88deba3c5bd661a";
const BLOCK_HASH = "0xfa78cb42d703195cf0d29cada217e395b7554e1892a3724da7396485b69988d0";
export const receipts = (receiptList as unknown) as TransactionReceipt[];
export const receipt = receipts.find(testReceipt => testReceipt.transactionHash === BURN_HASH) as TransactionReceipt;
if (typeof receipt === "undefined") {
  throw new Error("Could not find receipt");
}

export const blocks = (blockList as unknown) as RequiredBlockMembers[];
export const block = blocks.find(testBlock => testBlock.hash === BLOCK_HASH) as RequiredBlockMembers;
if (typeof block === "undefined") {
  throw new Error("Could not find block");
}
