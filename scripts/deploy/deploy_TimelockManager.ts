import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeployFunction } from './common/types';
import { deployAndVerifyProxy } from './common/utils';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const [
    councilMember1,
    councilMember2,
    councilMember3,
    councilMember4,
    councilMember5,
  ] = await hre.ethers.getSigners();
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl) {
    throw new Error('Access control address is not set');
  }

  await deployAndVerifyProxy(hre, getCommonContractNames().timelockManager, [
    addresses.accessControl,
    100,
    [
      councilMember1.address,
      councilMember2.address,
      councilMember3.address,
      councilMember4.address,
      councilMember5.address,
    ],
  ]);
};

export default func;
