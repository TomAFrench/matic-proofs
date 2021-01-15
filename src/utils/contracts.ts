import { Contract } from "@ethersproject/contracts";
import { Provider } from "@ethersproject/providers";

export const getRootChainManager = (rootChainProvider: Provider, rootChainContractAddress: string): Contract =>
  new Contract(
    rootChainContractAddress,
    [
      "function checkpointManagerAddress() view returns (address)",
      "function processedExits(bytes32) view returns (bool)",
    ],
    rootChainProvider,
  );

export const getCheckpointManager = async (
  rootChainProvider: Provider,
  rootChainContractAddress: string,
): Promise<Contract> => {
  const rootChainContract = getRootChainManager(rootChainProvider, rootChainContractAddress);
  const checkpointManagerAddress = await rootChainContract.checkpointManagerAddress();
  const checkpointManagerContract = new Contract(
    checkpointManagerAddress,
    ["function currentHeaderBlock() view returns (uint256)", "function getLastChildBlock() view returns (uint256)"],
    rootChainProvider,
  );

  return checkpointManagerContract;
};
