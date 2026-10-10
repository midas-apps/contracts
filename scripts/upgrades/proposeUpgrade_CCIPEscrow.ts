import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeUpgradeContracts } from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getMTokenOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'cci-escrow-upgrade-v1';

  const networkAddresses = getCurrentAddresses(hre);
  const mToken = getMTokenOrThrow(hre);
  const tokenAddresses = networkAddresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error('Token addresses not found');
  }

  await proposeUpgradeContracts(hre, upgradeId, 'ccipEscrow', [
    {
      mToken,
      addresses: tokenAddresses,
      contracts: [
        {
          contractType: 'ccipEscrow',
        },
      ],
    },
  ]);
};

export default func;
