import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeUpgradeContracts } from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  _skipValidation?: boolean,
) => {
  const upgradeId = 'mwin-upgrade-permissioned';
  const networkAddresses = getCurrentAddresses(hre);
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
