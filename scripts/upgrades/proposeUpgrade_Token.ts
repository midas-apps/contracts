import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeUpgradeContracts } from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getMTokenOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'acre-btc-upgrade-v2';
  const networkAddresses = getCurrentAddresses(hre);
  const mToken = getMTokenOrThrow(hre);
  const tokenAddresses = networkAddresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error('Token addresses not found');
  }

  await proposeUpgradeContracts(hre, upgradeId, 'token', [
    {
      mToken,
      addresses: tokenAddresses,
      contracts: [
        {
          contractType: 'token',
        },
      ],
    },
  ]);
};

export default func;
