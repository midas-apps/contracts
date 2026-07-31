import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContractsRaw,
  proposeUpgradeContractsRaw,
} from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'q2-testnet-timelock-manager-upgrade';

  const networkAddresses = getCurrentAddresses(hre);

  const action = getActionOrThrow(hre, upgradeActions);

  const fn =
    action === 'propose'
      ? proposeUpgradeContractsRaw
      : executeUpgradeContractsRaw;

  await fn(hre, upgradeId, [
    {
      contractType: 'timelockManager',
      contractName: 'MidasTimelockManager',
      proxyAddress: networkAddresses?.timelockManager ?? '',
    },
  ]);
};

export default func;
