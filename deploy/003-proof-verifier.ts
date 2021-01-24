import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();

  const checkpointManager = await deployments.deploy("MockCheckpointManager", {
    from: deployer,
    log: true,
  });

  await deployments.deploy("ProofVerifier", {
    from: deployer,
    args: [checkpointManager.address],
    log: true,
  });
};

export default func;
func.tags = ["ProofVerifier"];
func.dependencies = ["CheckpointManager"];
