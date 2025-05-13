import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getTokenContractNames } from '../../helpers/contracts';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';
import { getDeployer } from '../deploy/common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const deployer = await getDeployer(hre);

  const deployment = await hre.upgrades.upgradeProxy(
    addresses?.mBASIS?.redemptionVaultSwapper ?? '',
    await hre.ethers.getContractFactory(
      getTokenContractNames('mBASIS').rvSwapper!,
      deployer,
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
    getTokenContractNames('mBASIS').rvSwapper!,
    deployment.address,
  );
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
