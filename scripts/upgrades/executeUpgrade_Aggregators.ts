import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeUpgradeContracts } from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getMTokenOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'mwin-custom-aggregator-upgrade-v2';

  const networkAddresses = getCurrentAddresses(hre);
  const mToken = getMTokenOrThrow(hre);
  const tokenAddresses = networkAddresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error('Token addresses not found');
  }

  await executeUpgradeContracts(hre, upgradeId, 'customFeed', [
    {
      mToken,
      addresses: tokenAddresses,
      contracts: [
        {
          contractType: 'customAggregator',
          initializer: 'initializeV2',
          initializerArgs: [parseUnits('90', 8), parseUnits('140', 8)],
        },
      ],
    },
  ]);
};

export default func;
