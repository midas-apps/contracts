import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContractsRaw,
  proposeUpgradeContractsRaw,
} from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';
import { getActionOrThrow, upgradeActions } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'q2-testnet-custom-aggregator-upgrade-v2';

  const networkAddresses = getCurrentAddresses(hre);

  const action = getActionOrThrow(hre, upgradeActions);

  const fn =
    action === 'propose'
      ? proposeUpgradeContractsRaw
      : executeUpgradeContractsRaw;

  await fn(hre, upgradeId, [
    {
      contractName: getCommonContractNames().ac,
      proxyAddress: networkAddresses?.accessControl ?? '',
      contractType: 'accessControl',
    },
  ]);
};

export default func;
