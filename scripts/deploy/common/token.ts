import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getTokenContractNames } from '../../../helpers/contracts';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

export const deployMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const tokenContractName = getTokenContractNames(token).token;

  if (!tokenContractName) {
    throw new Error('Token contract name is not set');
  }

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(tokenContractName, owner),
    [addresses.accessControl],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`Deployed ${token}:`, deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, tokenContractName, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
