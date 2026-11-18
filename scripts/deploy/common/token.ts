import { constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DEFAULT_CLAWBACK_RECEIVER } from './types';
import { deployAndVerifyProxy } from './utils';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getCommonContractNames } from '../../../helpers/contracts';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import { getAllRoles } from '../../../helpers/roles';
import { getDeploymentConfigForToken } from '../configs/index';

export type DeployTokenConfig = {
  /** falls back to `DEFAULT_CLAWBACK_RECEIVER` */
  clawbackReceiver?: `0x${string}`;
};

export const deployMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const allRoles = getAllRoles();
  const roles = allRoles.tokenRoles[token];
  const metadata = mTokensMetadata[token];
  const isPermissioned = !!metadata.isPermissioned;
  const isMinBalance = !!metadata.isMinBalance;

  const tokenConfig = getDeploymentConfigForToken(token, hre.deploymentConfig)
    ?.networkConfigs?.[hre.network.config.chainId!]?.token;
  const clawbackReceiver =
    tokenConfig?.clawbackReceiver ?? DEFAULT_CLAWBACK_RECEIVER;

  console.log(`${token} clawback receiver: ${clawbackReceiver}`);

  await deployAndVerifyProxy(
    hre,
    getCommonContractNames().token,
    [
      addresses.accessControl,
      clawbackReceiver,
      constants.MaxUint256,
      isPermissioned,
      isMinBalance,
      metadata.name,
      metadata.symbol,
    ],
    undefined,
    {
      constructorArgs: [
        roles.tokenManager,
        roles.minter,
        roles.burner,
        roles.greenlisted,
        roles.minBalanceExempt,
      ],
    },
  );
};
