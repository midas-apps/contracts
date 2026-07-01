import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getUpgradeConfig,
  resolveAggregatorTarget,
} from './common/aggregator-deviation';
import { executeUpgradeContracts } from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getMTokenOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

/**
 * Configure before running (must match propose):
 */
const deviation = parseUnits('0.35', 8);

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

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

  await executeUpgradeContracts(hre, upgradeId, target.addressKey, [
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

// yarn hardhat runscript scripts/upgrades/executeUpgrade_AggregatorDeviation.ts --network <NETWORK> --mtoken <MTOKEN>
