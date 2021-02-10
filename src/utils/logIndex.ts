import { TransactionReceipt } from "@ethersproject/providers";
import { HashZero } from "@ethersproject/constants";
import { EventSignature } from "../constants";

// Due to withdrawals sharing the Transfer event, we must add some extra checks to ignore non-burn transfers
// This is required to be able to handle transactions which moves tokens and then burns them atomically
const defaultPredicate = (expectedEventSig: string, topics: string[]) => topics[0].toLowerCase() === expectedEventSig;
const erc20LikePredicate = (expectedEventSig: string, topics: string[]) =>
  defaultPredicate(expectedEventSig, topics) && topics[2].toLowerCase() === HashZero;
const erc1155LikePredicate = (expectedEventSig: string, topics: string[]) =>
  defaultPredicate(expectedEventSig, topics) && topics[3].toLowerCase() === HashZero;

const predicateMap: Record<EventSignature, (topics: string[]) => boolean> = {
  [EventSignature.ERC20Transfer]: (topics: string[]) => erc20LikePredicate(EventSignature.ERC20Transfer, topics),
  [EventSignature.ERC721Transfer]: (topics: string[]) => erc20LikePredicate(EventSignature.ERC721Transfer, topics),
  [EventSignature.ERC1155TransferSingle]: (topics: string[]) =>
    erc1155LikePredicate(EventSignature.ERC1155TransferSingle, topics),
  [EventSignature.ERC1155TransferBatch]: (topics: string[]) =>
    erc1155LikePredicate(EventSignature.ERC1155TransferBatch, topics),
  [EventSignature.SendMessage]: (topics: string[]) => defaultPredicate(EventSignature.SendMessage, topics),
};

/**
 * Pulls the index of the first burn log from a transaction receipt.
 * @param transactionReceipt - receipt for which we want to pull logs from
 * @param logEventSig - The log which corresponds to the Transfer event for the asset type being burnt
 * @param selectedBurn - selects which burn we want to find the index for
 */
export const getLogIndex = (
  transactionReceipt: TransactionReceipt,
  logEventSig: EventSignature,
  selectedBurn = 0,
): number => {
  const predicate = predicateMap[logEventSig];
  const eventIndices = transactionReceipt.logs.reduce((acc: number[], log, index) => {
    if (predicate(log.topics)) {
      acc.push(index);
    }
    return acc;
  }, []);

  if (eventIndices.length === 0) {
    throw new Error("Burn log not found in receipt");
  }

  return eventIndices[selectedBurn];
};
