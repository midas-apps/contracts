import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  executeUpgradeContractsRaw,
  proposeUpgradeContractsRaw,
} from './common/upgrade-contracts';

import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  getCommonContractNames,
  getV2VaultConstructorArgs,
} from '../../helpers/contracts';
import {
  getActionOrThrow,
  isMTokenName,
  upgradeActions,
} from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';

/**
 * Upgrades the regular v2 vaults (`depositVaultV2` / `redemptionVaultV2`
 * keys) of every product on the network to the current v2 implementation.
 * v1 vaults (base keys) are upgraded from the `main` branch
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const upgradeId = 'q2-testnet-custom-aggregator-upgrade';

  const networkAddresses = getCurrentAddresses(hre, 'v2');

  const action = getActionOrThrow(hre, upgradeActions);

  const fn =
    action === 'propose'
      ? proposeUpgradeContractsRaw
      : executeUpgradeContractsRaw;

  const values = Object.keys(networkAddresses ?? {})
    .filter(isMTokenName)
    .flatMap((mToken) => {
      const { depositVault, redemptionVault } = networkAddresses![mToken]!;

      return [
        ...(depositVault
          ? [
              {
                mToken,
                proxyAddress: depositVault,
                contractType: 'depositVault',
                contractName: getCommonContractNames().dv,
                constructorArgs: getV2VaultConstructorArgs(
                  mToken,
                  'depositVault',
                ),
              },
            ]
          : []),
        ...(redemptionVault
          ? [
              {
                mToken,
                proxyAddress: redemptionVault,
                contractType: 'redemptionVault',
                contractName: getCommonContractNames().rv,
                constructorArgs: getV2VaultConstructorArgs(
                  mToken,
                  'redemptionVault',
                ),
              },
            ]
          : []),
      ];
    });

  if (!values.length) {
    throw new Error(`No v2 vaults are configured on ${hre.network.name}`);
  }

  await fn(hre, upgradeId, values);
};

export default func;
