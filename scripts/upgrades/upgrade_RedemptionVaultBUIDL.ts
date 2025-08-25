import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getTokenContractNames } from '../../helpers/contracts';
import { getDeployer } from '../deploy/common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const deployer = await getDeployer(hre);

  const deployment = await hre.upgrades.upgradeProxy(
    addresses?.mTBILL?.redemptionVaultBuidl ?? '',
    await hre.ethers.getContractFactory(
      getTokenContractNames('mTBILL').rvBuidl!,
      deployer,
    ),
    {
      redeployImplementation: 'onchange',
    },
  );

  if (typeof deployment !== 'string') {
    await deployment.deployTransaction.wait(5);
    console.log(deployment.to);
  } else {
    console.log(deployment);
  }
};

func(hre).then(console.log).catch(console.error);
