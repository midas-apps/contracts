import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContractsRaw,
  proposeUpgradeContractsRaw,
} from './common/upgrade-contracts';

import { MTokenName } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { getCommonContractNames } from '../../helpers/contracts';
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

  const values = mTokens
    .map((mToken) => {
      const roles = getRolesForToken(mToken);

      return [
        {
          mToken,
          proxyAddress: networkAddresses?.[mToken]?.depositVault ?? '',
          contractType: 'depositVault',
          contractName: getCommonContractNames().dv,
          constructorArgs: [roles.depositVaultAdmin ?? '', roles.greenlisted],
        },
        {
          mToken,
          proxyAddress: networkAddresses?.[mToken]?.redemptionVault ?? '',
          contractType: 'redemptionVault',
          contractName: getCommonContractNames().rv,
          constructorArgs: [
            roles.redemptionVaultAdmin ?? '',
            roles.greenlisted,
          ],
        },
      ];
    })
    .flat();

  await fn(hre, upgradeId, values);
};

export default func;
