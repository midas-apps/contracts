import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getTokenContractNames } from '../../helpers/contracts';
import { getDeployer } from '../deploy/common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const deployer = await getDeployer(hre);

  const deployment = await hre.upgrades.prepareUpgrade(
    addresses?.liquidHYPE?.redemptionVaultSwapper ?? '',
    await hre.ethers.getContractFactory(
      getTokenContractNames('liquidHYPE').rvSwapper!,
      deployer,
    ),
    {
      unsafeAllow: ['constructor'],
      redeployImplementation: 'always',
    },
  );

  if (typeof deployment !== 'string') {
    await deployment.wait(5);
    console.log(deployment.to);
  } else {
    console.log(deployment);
  }
};

func(hre).then(console.log).catch(console.error);
