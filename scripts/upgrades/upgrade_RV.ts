import * as hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getTokenContractNames } from '../../helpers/contracts';
import { getDeployer } from '../deploy/common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);

  const deployer = await getDeployer(hre);

  const deployment = await hre.upgrades.upgradeProxy(
    addresses?.mRE7SOL?.redemptionVault ?? '',
    await hre.ethers.getContractFactory(
      getTokenContractNames('mRE7SOL').rv!,
      deployer,
    ),
    {
      redeployImplementation: 'onchange',
    },
  );

  if (typeof deployment !== 'string') {
    await deployment.deployTransaction.wait(5);
    console.log('deployment', deployment);
    // console.log('deployment.to', deployment.to);
    // await etherscanVerify(hre, deployment.to!);
  } else {
    console.log('deployment', deployment);
  }
};

func(hre).then(console.log).catch(console.error);
