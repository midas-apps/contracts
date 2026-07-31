import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContractsRaw,
  proposeUpgradeContractsRaw,
} from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getAllRoles } from '../../helpers/roles';
import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'q2-testnet-custom-aggregator-upgrade';

  const networkAddresses = getCurrentAddresses(hre);

  const action = getActionOrThrow(hre, upgradeActions);

  const fn =
    action === 'propose'
      ? proposeUpgradeContractsRaw
      : executeUpgradeContractsRaw;

  await fn(hre, upgradeId, [
    {
      contractType: 'dataFeed',
      contractName: 'DataFeed',
      proxyAddress: networkAddresses?.paymentTokens?.usdc?.dataFeed ?? '',
      constructorArgs: [getAllRoles().common.defaultAdmin],
    },
  ]);
};

export default func;
