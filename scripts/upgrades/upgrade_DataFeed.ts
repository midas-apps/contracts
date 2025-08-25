import { parseUnits } from 'ethers/lib/utils';
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
    addresses?.mTBILL?.dataFeed ?? '',
    await hre.ethers.getContractFactory(
      getTokenContractNames('mTBILL').dataFeed!,
      deployer,
    ),
    {
      call: {
        fn: 'initializeV2',
        args: [
          addresses?.accessControl ?? '',
          addresses?.mTBILL?.customFeed ?? '',
          hre.ethers.constants.MaxUint256,
          parseUnits('0.1', 8),
          parseUnits('1000', 8),
        ],
      },
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
