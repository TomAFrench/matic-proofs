import { hexlify } from "@ethersproject/bytes";
import { toBuffer, rlp } from "ethereumjs-util";

import { TransactionReceipt } from "@ethersproject/providers";

// Implementation of getReceiptBytes as taken from Matic.js repo:
// See: https://github.com/maticnetwork/matic.js/blob/6860dbb874b0213260cbb8e35ce81a471ddade6e/src/libs/ProofsUtil.ts#L190-L208
export const referenceReceiptBytesImplementation = (receiptData: TransactionReceipt): Buffer =>
  rlp.encode([
    toBuffer(
      // eslint-disable-next-line no-nested-ternary
      receiptData.status !== undefined && receiptData.status != null
        ? receiptData.status
          ? "0x1"
          : "0x"
        : receiptData.root,
    ),
    toBuffer(hexlify(receiptData.cumulativeGasUsed)),
    toBuffer(receiptData.logsBloom),

    // encoded log array
    receiptData.logs.map(l => {
      // [address, [topics array], data]
      return [
        toBuffer(l.address), // convert address to buffer
        l.topics.map(toBuffer), // convert topics to buffer
        toBuffer(l.data), // convert data to buffer
      ];
    }),
  ]);
