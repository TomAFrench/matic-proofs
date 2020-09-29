import { encode as rlpEncode } from "@ethersproject/rlp";
import { AbiCoder } from "@ethersproject/abi";

import {
  erc20TransferEventSig,
  erc721TransferEventSig,
  erc1155TransferSingleEventSig,
  erc1155TransferBatchEventSig,
} from "./constants";

const abi = new AbiCoder();

export const getERC20TransferLog = ({ overrideSig, from, to, amount }) =>
  rlpEncode(["0x0", [overrideSig || erc20TransferEventSig, from, to], `0x${amount.toString(16)}`]);

export const getERC721TransferLog = ({ overrideSig, from, to, tokenId }) =>
  rlpEncode(["0x0", [overrideSig || erc721TransferEventSig, from, to, `0x${tokenId.toString(16)}`]]);

export const getERC1155TransferSingleLog = ({ overrideSig, operator, from, to, tokenId, amount }) =>
  rlpEncode([
    "0x0",
    [overrideSig || erc1155TransferSingleEventSig, operator, from, to],
    abi.encode(["uint256", "uint256"], [`0x${tokenId.toString(16)}`, `0x${amount.toString(16)}`]),
  ]);

export const getERC1155TransferBatchLog = ({ overrideSig, operator, from, to, tokenIds, amounts }) =>
  rlpEncode([
    "0x0",
    [overrideSig || erc1155TransferBatchEventSig, operator, from, to],
    abi.encode(
      ["uint256[]", "uint256[]"],
      [tokenIds.map(t => `0x${t.toString(16)}`), amounts.map(a => `0x${a.toString(16)}`)],
    ),
  ]);
