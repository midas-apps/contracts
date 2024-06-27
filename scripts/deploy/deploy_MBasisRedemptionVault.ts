import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_REDEMPTION_VAULT_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses) throw new Error('Addresses are not set');
  const { deployer } = await hre.getNamedAccounts();

  console.log({ deployer });

  const tokenAddresses = addresses.mBASIS;

  if (!tokenAddresses) throw new Error('Token addresses are not set');

  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying MBasisRedemptionVault...');
  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(
      M_BASIS_REDEMPTION_VAULT_CONTRACT_NAME,
      owner,
    ),
    [
      addresses?.accessControl,
      tokenAddresses?.token,
      tokenAddresses?.tokensReceiver,
    ],
    {
      unsafeAllow: ['constructor'],
    },
  );
  console.log('Deployed MBasisRedemptionVault:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(
    hre,
    M_BASIS_REDEMPTION_VAULT_CONTRACT_NAME,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);