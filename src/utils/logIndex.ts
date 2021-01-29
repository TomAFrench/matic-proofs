import { TransactionReceipt } from "@ethersproject/providers";
import { HashZero } from "@ethersproject/constants";

/**
 * Pulls the index of the first burn log from a transaction receipt.
 * @param transactionReceipt - receipt for which we want to pull logs from
 * @param logEventSig - The log which corresponds to the Transfer event for the asset type being burnt
 * @param selectedBurn - selects which burn we want to find the index for
 */
export const getLogIndex = (transactionReceipt: TransactionReceipt, logEventSig: string, selectedBurn = 0): number => {
  const burnIndices = transactionReceipt.logs.reduce((acc: number[], log, index) => {
    // Check topics[0] to find a transfer of the correct asset type e.g. ERC20
    // Check topics[2] to filter out any transfers previous to the burn i.e. those not to the zero address
    if (log.topics[0].toLowerCase() === logEventSig.toLowerCase() && log.topics[2].toLowerCase() === HashZero) {
      acc.push(index);
    }
    return acc;
  }, []);

  if (burnIndices.length === 0) {
    throw new Error("Burn log not found in receipt");
  }

  return burnIndices[selectedBurn];
};
