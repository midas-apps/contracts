import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  const deployment = await hre.upgrades.upgradeProxy(
    addresses?.mBASIS?.redemptionVaultSwapper ?? '',
    await hre.ethers.getContractFactory(
      M_BASIS_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
      owner,
    ),
    {
      unsafeAllow: ['constructor'],
      redeployImplementation: 'onchange',
    },
  );

  if (deployment.deployTransaction) {
    await deployment.deployTransaction.wait(5);
  }
  await logDeployProxy(
    hre,
    M_BASIS_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
