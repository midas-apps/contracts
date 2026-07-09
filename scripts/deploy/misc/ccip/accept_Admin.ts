import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ccipNetworkConfig, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

  const deployer = await getDeployer(hre);
  const addresses = getCurrentAddresses(hre);

  const network = hre.network.name as Network;

  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses?.token) {
    throw new Error('token address is not found');
  }

  const poolAddress = tokenAddresses?.ccip?.tokenPool;

  if (!poolAddress) {
    throw new Error('pool address is not found');
  }

  const tokenAdminRegistry = ccipNetworkConfig[network]?.tokenAdminRegistry;

  if (!tokenAdminRegistry) {
    throw new Error('tokenAdminRegistry is not found');
  }

  const contract = await hre.ethers.getContractAt(
    'TokenAdminRegistry',
    tokenAdminRegistry,
    deployer,
  );

  await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.acceptAdminRole(tokenAddresses.token),
    {
      action: 'update-ccip',
    },
  );
};

export default func;
