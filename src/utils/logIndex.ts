import { TransactionReceipt } from "@ethersproject/providers";

export const getLogIndex = (transactionReceipt: TransactionReceipt, logEventSig: string): number => {
  const logIndex = transactionReceipt.logs.findIndex(log => log.topics[0].toLowerCase() === logEventSig.toLowerCase());
  if (logIndex === -1) {
    throw new Error("Log not found in receipt");
  }
  return logIndex;
};
