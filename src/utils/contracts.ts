import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import checkpointManagerABI from "../abi/ICheckpointManager.json";
import rootChainManagerABI from "../abi/RootChainManager.json";
import stateReceiverABI from "../abi/IStateReceiver.json";

export const getRootChainManager = (rootChainProvider: Provider, rootChainContractAddress: string): Contract =>
  new Contract(rootChainContractAddress, rootChainManagerABI, rootChainProvider);

export const getCheckpointManager = async (
  rootChainProvider: Provider,
  rootChainContractAddress: string,
): Promise<Contract> => {
  const rootChainContract = getRootChainManager(rootChainProvider, rootChainContractAddress);
  const checkpointManagerAddress = await rootChainContract.checkpointManagerAddress();
  const checkpointManagerContract = new Contract(checkpointManagerAddress, checkpointManagerABI, rootChainProvider);

  return checkpointManagerContract;
};

export const getStateReceiver = (maticChainProvider: Provider): Contract => {
  // This address is the same across all Matic chains
  const STATE_RECEIVER_ADDRESS = "0x0000000000000000000000000000000000001001";
  const stateReceiver = new Contract(STATE_RECEIVER_ADDRESS, stateReceiverABI, maticChainProvider);

  return stateReceiver;
};
