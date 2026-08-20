import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getUpgradeConfig,
  resolveAggregatorTarget,
} from './common/aggregator-deviation';
import { proposeUpgradeContracts } from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { DeployFunction } from '../deploy/common/types';

/**
 * Configure before running:
 */
const deviation = parseUnits('0.35', 8);

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  _skipValidation?: boolean,
) => {
  const networkAddresses = getCurrentAddresses(hre);
  const tokenAddresses = networkAddresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  const target = resolveAggregatorTarget(
    hre.config.paths.root,
    mToken,
    tokenAddresses,
  );
  const { initializer, upgradeId } = await getUpgradeConfig(
    hre,
    mToken,
    target,
  );

  await proposeUpgradeContracts(hre, upgradeId, target.addressKey, [
    {
      mToken,
      addresses: tokenAddresses,
      contracts: [
        {
          contractType: target.contractType,
          initializer,
          initializerArgs: [deviation],
        },
      ],
    },
  ]);
};

export default func;
