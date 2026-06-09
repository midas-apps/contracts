import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';

import {
  Account,
  OptionalCommonParams,
  getAccount,
  handleRevert,
} from './common.helpers';

import { encodeFnSelector } from '../../helpers/utils';
import {
  Blacklistable,
  Greenlistable,
  MidasAccessControl,
} from '../../typechain-types';

type CommonParamsBlackList = {
  blacklistable: Blacklistable;
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
};

type CommonParamsGreenList = {
  greenlistable: Greenlistable;
  accessControl: MidasAccessControl;
  role?: string;
  owner: SignerWithAddress;
};

export const acErrors = {
  WMAC_HASNT_ROLE: (args?: unknown[], contract?: Contract) => ({
    contract,
    customErrorName: 'HasntRole',
    args,
  }),
  WMAC_BLACKLISTED: (args?: unknown[], contract?: Contract) => ({
    contract,
    customErrorName: 'Blacklisted',
    args,
  }),
  WMAC_HASNT_PERMISSION: (args?: unknown[], contract?: Contract) => ({
    contract,
    customErrorName: 'NoFunctionPermission',
    args,
  }),
};

export const blackList = async (
  { blacklistable, accessControl, owner }: CommonParamsBlackList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (
    await handleRevert(
      accessControl
        .connect(opt?.from ?? owner)
        .grantRole.bind(this, await blacklistable.BLACKLISTED_ROLE(), account),
      accessControl,
      opt,
    )
  ) {
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .grantRole(await blacklistable.BLACKLISTED_ROLE(), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.BLACKLISTED_ROLE(),
      account,
    ),
  ).eq(true);
};

export const unBlackList = async (
  { blacklistable, accessControl, owner }: CommonParamsBlackList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (
    await handleRevert(
      accessControl
        .connect(opt?.from ?? owner)
        .revokeRole.bind(this, await blacklistable.BLACKLISTED_ROLE(), account),
      accessControl,
      opt,
    )
  ) {
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .revokeRole(await blacklistable.BLACKLISTED_ROLE(), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleRevoked(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.BLACKLISTED_ROLE(),
      account,
    ),
  ).eq(false);
};

export const greenList = async (
  { greenlistable, accessControl, owner, role }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (
    await handleRevert(
      accessControl
        .connect(opt?.from ?? owner)
        .revokeRole.bind(
          this,
          role ?? (await greenlistable.GREENLISTED_ROLE()),
          account,
        ),
      accessControl,
      opt,
    )
  ) {
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .grantRole(role ?? (await greenlistable.GREENLISTED_ROLE()), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      role ?? (await accessControl.GREENLISTED_ROLE()),
      account,
    ),
  ).eq(true);
};

export const unGreenList = async (
  { greenlistable, accessControl, owner, role }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (
    await handleRevert(
      accessControl
        .connect(opt?.from ?? owner)
        .revokeRole.bind(
          this,
          role ?? (await greenlistable.GREENLISTED_ROLE()),
          account,
        ),
      accessControl,
      opt,
    )
  ) {
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .revokeRole(role ?? (await greenlistable.GREENLISTED_ROLE()), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleRevoked(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      role ?? (await accessControl.GREENLISTED_ROLE()),
      account,
    ),
  ).eq(false);
};

export const grantRoleMultTester = async (
  {
    accessControl,
    owner,
  }: {
    accessControl: MidasAccessControl;
    owner: SignerWithAddress;
  },
  roles: string[],
  accounts: string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .grantRoleMult.bind(this, roles, accounts);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, role] of roles.entries()) {
    expect(await accessControl.hasRole(role, accounts[index])).eq(true);
  }
};

export const revokeRoleMultTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  roles: string[],
  accounts: string[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .revokeRoleMult.bind(this, roles, accounts);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, role] of roles.entries()) {
    expect(await accessControl.hasRole(role, accounts[index])).eq(false);
  }
};

export const grantRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  role: string,
  account: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .grantRole.bind(this, role, account);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  expect(await accessControl.hasRole(role, account)).eq(true);
};

export const revokeRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  role: string,
  account: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .revokeRole.bind(this, role, account);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  expect(await accessControl.hasRole(role, account)).eq(false);
};

export const setIsUserFacingRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  params: { role: string; enabled: boolean }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .setUserFacingRoleMult.bind(this, params);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl.isUserFacingRole(param.role);
    }),
  );

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const logs = txReceipt.logs
    .filter((log) => log.address === accessControl.address)
    .map((log) => accessControl.interface.parseLog(log))
    .filter((v) => v.name === 'SetUserFacingRole')
    .map((v) => v.args);

  for (const [index, stateBefore] of statesBefore.entries()) {
    const param = params[index];

    if (stateBefore !== param.enabled) {
      const log = logs.filter(
        (log) => log.role === param.role && log.enabled === param.enabled,
      );
      expect(log.length).eq(1);
    }

    expect(await accessControl.isUserFacingRole(param.role)).eq(param.enabled);
  }
};

export const setGrantOperatorRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  masterRole: string,
  params: {
    targetContract: string;
    functionSelector: string;
    operator: string;
    enabled: boolean;
  }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .setGrantOperatorRoleMult.bind(this, masterRole, params);

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl[
        'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
      ](
        masterRole,
        param.targetContract,
        param.functionSelector,
        param.operator,
      );
    }),
  );

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const logs = txReceipt.logs
    .filter((log) => log.address === accessControl.address)
    .map((log) => accessControl.interface.parseLog(log))
    .filter((v) => v.name === 'SetGrantOperatorRole')
    .map((v) => v.args);

  for (const [index, stateBefore] of statesBefore.entries()) {
    const param = params[index];

    if (stateBefore !== param.enabled) {
      const log = logs.filter(
        (log) =>
          log.masterRole === masterRole &&
          log.targetContract === param.targetContract &&
          log.functionSelector === param.functionSelector &&
          log.operator === param.operator &&
          log.enabled === param.enabled,
      );
      expect(log.length).eq(1);
      expect(log[0].enabled).eq(param.enabled);
    }

    expect(
      await accessControl[
        'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
      ](
        masterRole,
        param.targetContract,
        param.functionSelector,
        param.operator,
      ),
    ).eq(param.enabled);
  }
};

export const setPermissionRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  masterRole: string,
  targetContract: string,
  functionSelector: string,
  params: {
    account: string;
    enabled: boolean;
  }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .setPermissionRoleMult.bind(
      this,
      masterRole,
      targetContract,
      functionSelector,
      params,
    );

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl[
        'hasFunctionPermission(bytes32,address,bytes4,address)'
      ](masterRole, targetContract, functionSelector, param.account);
    }),
  );

  const txPromise = callFn();
  await txPromise;
  // await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const logs = txReceipt.logs
    .filter((log) => log.address === accessControl.address)
    .map((log) => accessControl.interface.parseLog(log))
    .filter((v) => v.name === 'SetPermissionRole')
    .map((v) => v.args);

  for (const [index, stateBefore] of statesBefore.entries()) {
    const param = params[index];

    if (stateBefore !== param.enabled) {
      const log = logs.filter(
        (log) =>
          log.masterRole === masterRole &&
          log.targetContract === targetContract &&
          log.functionSelector === functionSelector &&
          log.account === param.account &&
          log.enabled === param.enabled,
      );
      expect(log.length).eq(1);
      expect(log[0].enabled).eq(param.enabled);
    }

    expect(
      await accessControl[
        'hasFunctionPermission(bytes32,address,bytes4,address)'
      ](masterRole, targetContract, functionSelector, param.account),
    ).eq(param.enabled);
  }
};

type SetupFunctionAccessGrantOperatorParams = {
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
  masterRole: string;
  targetContract: string;
  functionSelector: string;
  grantOperator: SignerWithAddress;
};

export const setupGrantOperatorRole = async ({
  accessControl,
  owner,
  masterRole,
  targetContract,
  functionSelector,
  grantOperator,
}: SetupFunctionAccessGrantOperatorParams) => {
  await setGrantOperatorRoleTester({ accessControl, owner }, masterRole, [
    {
      targetContract,
      functionSelector,
      operator: grantOperator.address,
      enabled: true,
    },
  ]);
};

export const setupPermissionRole = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  vaultRole: string,
  vaultAddress: string,
  functionSignature: string,
  account: string,
) => {
  const selector = encodeFnSelector(functionSignature);
  await setupGrantOperatorRole({
    accessControl,
    owner,
    masterRole: vaultRole,
    targetContract: vaultAddress,
    functionSelector: selector,
    grantOperator: owner,
  });
  await setPermissionRoleTester(
    { accessControl, owner },
    vaultRole,
    vaultAddress,
    selector,
    [
      {
        account,
        enabled: true,
      },
    ],
  );
};
