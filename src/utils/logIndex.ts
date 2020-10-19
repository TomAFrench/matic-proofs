import { TransactionReceipt } from "@ethersproject/providers";
import { HashZero } from "@ethersproject/constants";

export const getLogIndex = (transactionReceipt: TransactionReceipt, logEventSig: string): number => {
  // Check topics[0] to find a transfer of the correct asset type e.g. ERC20
  // Check topics[2] to filter out any transfers previous to the burn i.e. those not to the zero address
  const logIndex = transactionReceipt.logs.findIndex(
    log => log.topics[0].toLowerCase() === logEventSig.toLowerCase() && log.topics[2].toLowerCase() === HashZero,
  );
  if (logIndex === -1) {
    throw new Error("Burn log not found in receipt");
  }
  return logIndex;
};
