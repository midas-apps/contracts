import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { constants } from 'ethers';
import { ethers } from 'hardhat';

import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControlTest,
  MidasAccessControlTimelockController,
  MidasPauseManagerTest,
  MidasTimelockManager,
  MToken,
} from '../../../typechain-types';
import { asyncForEach } from '../../common/common.helpers';
import { deployProxyContract } from '../../common/deploy.helpers';

type MTokenRoles = {
  minter: string;
  burner: string;
  tokenManager: string;
  greenlisted: string;
  minBalanceExempt: string;
};

export async function deployAccessControlInfra(
  councilMembers: SignerWithAddress[],
) {
  const accessControl = await deployProxyContract<MidasAccessControlTest>(
    'MidasAccessControlTest',
    [0, []],
  );

  const pauseManager = await deployProxyContract<MidasPauseManagerTest>(
    'MidasPauseManagerTest',
    [accessControl.address, 0, 3600],
  );

  const timelockManager = await deployProxyContract<MidasTimelockManager>(
    'MidasTimelockManager',
    [
      accessControl.address,
      100,
      councilMembers.map((member) => member.address),
    ],
  );

  const timelock =
    await deployProxyContract<MidasAccessControlTimelockController>(
      'MidasAccessControlTimelockController',
      [timelockManager.address],
    );

  await timelockManager.initializeTimelock(timelock.address);
  await accessControl.initializeRelationships(
    timelockManager.address,
    pauseManager.address,
  );

  return { accessControl, pauseManager, timelockManager, timelock };
}

export async function deployIntegrationMToken(
  accessControl: string,
  clawbackReceiver: string,
  roles: MTokenRoles,
  metadata: {
    name: string;
    symbol: string;
    isPermissioned?: boolean;
  } = mTokensMetadata.mTBILL,
) {
  return deployProxyContract<MToken>(
    'mToken',
    [
      accessControl,
      clawbackReceiver,
      constants.MaxUint256,
      !!metadata.isPermissioned,
      false,
      metadata.name,
      metadata.symbol,
    ],
    'initialize',
    [
      roles.tokenManager,
      roles.minter,
      roles.burner,
      roles.greenlisted,
      roles.minBalanceExempt,
    ],
  );
}

export async function setupIntegrationBase() {
  const [
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    clawbackReceiver,
    ...rest
  ] = await ethers.getSigners();
  const councilMembers = rest.slice(0, 5);
  const regularUsers = rest.slice(5);

  const roles = getAllRoles();
  const mTBILLRoles = roles.tokenRoles.mTBILL;

  const { accessControl, pauseManager, timelockManager, timelock } =
    await deployAccessControlInfra(councilMembers);

  const mTBILL = await deployIntegrationMToken(
    accessControl.address,
    clawbackReceiver.address,
    mTBILLRoles,
  );

  const ownerRoles = [
    roles.common.defaultAdmin,
    mTBILLRoles.minter,
    mTBILLRoles.burner,
    mTBILLRoles.tokenManager,
    mTBILLRoles.depositVaultAdmin,
    mTBILLRoles.redemptionVaultAdmin,
    roles.common.greenlistedOperator,
  ];

  await asyncForEach(ownerRoles, async (role) => {
    await accessControl['grantRole(bytes32,address)'](role, owner.address);
  });

  await accessControl['grantRole(bytes32,address)'](
    mTBILLRoles.depositVaultAdmin,
    vaultAdmin.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    mTBILLRoles.redemptionVaultAdmin,
    vaultAdmin.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    roles.common.greenlisted,
    testUser.address,
  );

  return {
    accessControl,
    pauseManager,
    timelockManager,
    timelock,
    mTBILL,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    clawbackReceiver,
    councilMembers,
    regularUsers,
    roles,
  };
}
