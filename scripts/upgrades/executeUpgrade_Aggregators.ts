import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeUpgradeContracts } from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  _skipValidation?: boolean,
) => {
  const upgradeId = 'mkralpha-custom-aggregator-upgrade-v2';
  const networkAddresses = getCurrentAddresses(hre);
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
          initializerArgs: [parseUnits('0.66', 8)],
        },
      ],
    },
  ]);
};

export default func;
