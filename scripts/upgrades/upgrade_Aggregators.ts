import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContractsRaw,
  proposeUpgradeContractsRaw,
} from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { getRolesForToken } from '../../helpers/roles';
import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'q2-testnet-custom-aggregator-upgrade';

  const networkAddresses = getCurrentAddresses(hre);
  const mTokens = ['mTBILL', 'mSL'] as MTokenName[];

  const action = getActionOrThrow(hre, upgradeActions);

  const fn =
    action === 'propose'
      ? proposeUpgradeContractsRaw
      : executeUpgradeContractsRaw;

  const types = ['customFeed', 'customFeedGrowth'] as const;

  const values = mTokens
    .map((mToken) => {
      return types
        .map((type) => {
          return {
            mToken,
            proxyAddress: networkAddresses?.[mToken]?.[type] ?? '',
            contractType:
              type === 'customFeed'
                ? 'customAggregator'
                : 'customAggregatorGrowth',
            contractName:
              type === 'customFeed'
                ? 'CustomAggregatorV3CompatibleFeed'
                : 'CustomAggregatorV3CompatibleFeedGrowth',
            constructorArgs: [getRolesForToken(mToken).customFeedAdmin ?? ''],
          };
        })
        .filter((v) => v.proxyAddress !== '');
    })
    .flat();

  await fn(hre, upgradeId, values);
};

export default func;
