import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";
import checkpointManagerABI from "../abi/ICheckpointManager.json";
import rootChainManagerABI from "../abi/RootChainManager.json";

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
