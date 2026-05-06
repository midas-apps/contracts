import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, Contract, ethers } from 'ethers';

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
  MidasAccessControlTimelockController,
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
  WMAC_HAS_ROLE: (args?: unknown[], contract?: Contract) => ({
    contract,
    customErrorName: 'HasRole',
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

export const greenListToggler = async (
  { accessControl, owner, role }: CommonParamsGreenList & { role: string },
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (
    await handleRevert(
      accessControl
        .connect(opt?.from ?? owner)
        .grantRole.bind(this, role, account),
      accessControl,
      opt,
    )
  ) {
    return;
  }

  await expect(
    accessControl.connect(opt?.from ?? owner).grantRole(role, account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(await accessControl.hasRole(role, account)).eq(true);
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

export const setRoleTimelocksTester = async (
  { accessControl, owner }: CommonParamsTimelock,
  roles: string[],
  delays: BigNumberish[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .setRoleTimelocks.bind(this, roles, delays);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, role] of roles.entries()) {
    expect(await accessControl.roleTimelocks(role)).eq(delays[index]);
  }
};

type CommonParamsTimelock = {
  accessControl: MidasAccessControl;
  timelock: MidasAccessControlTimelockController;
  owner: SignerWithAddress;
};

export const scheduleTimelockTransactionTester = async (
  { accessControl, timelock, owner }: CommonParamsTimelock,
  target: string,
  data: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .scheduleTimelockTransactions.bind(this, [target], [data]);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const calldataWithCaller = ethers.utils.solidityPack(
    ['bytes', 'address'],
    [data, from.address],
  );

  const operationId = await timelock.hashOperation(
    target,
    0,
    calldataWithCaller,
    ethers.constants.HashZero,
    ethers.constants.HashZero,
  );

  expect(await timelock.isOperation(operationId)).to.be.true;
  expect(await timelock.isOperationReady(operationId)).to.be.false;
  expect(await timelock.isOperationDone(operationId)).to.be.false;
  expect(await timelock.isOperationPending(operationId)).to.be.true;
};

export const executeTimelockTransactionTester = async (
  { accessControl, timelock, owner }: CommonParamsTimelock,
  target: string,
  data: string,
  originalCaller: string,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .executeTimelockTransaction.bind(this, target, data, originalCaller);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const calldataWithCaller = ethers.utils.solidityPack(
    ['bytes', 'address'],
    [data, originalCaller],
  );

  const operationId = await timelock.hashOperation(
    target,
    0,
    calldataWithCaller,
    ethers.constants.HashZero,
    ethers.constants.HashZero,
  );

  expect(await timelock.isOperation(operationId)).to.be.true;
  expect(await timelock.isOperationReady(operationId)).to.be.false;
  expect(await timelock.isOperationDone(operationId)).to.be.true;
  expect(await timelock.isOperationPending(operationId)).to.be.false;
};

export const setFunctionAccessAdminRoleEnabledTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  params: { functionAccessAdminRole: string; enabled: boolean }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .setFunctionAccessAdminRoleEnabledMult.bind(this, params);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl.functionAccessAdminRoleEnabled(
        param.functionAccessAdminRole,
      );
    }),
  );

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const logs = txReceipt.logs
    .filter((log) => log.address === accessControl.address)
    .map((log) => accessControl.interface.parseLog(log))
    .filter((v) => v.name === 'FunctionAccessAdminRoleEnable')
    .map((v) => v.args);

  for (const [index, stateBefore] of statesBefore.entries()) {
    const param = params[index];

    if (stateBefore !== param.enabled) {
      const log = logs.filter(
        (log) =>
          log.functionAccessAdminRole === param.functionAccessAdminRole &&
          log.enabled === param.enabled,
      );
      expect(log.length).eq(1);
    }

    expect(
      await accessControl.functionAccessAdminRoleEnabled(
        param.functionAccessAdminRole,
      ),
    ).eq(param.enabled);
  }
};

export const setFunctionAccessGrantOperatorTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  params: {
    functionAccessAdminRole: string;
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
    .setFunctionAccessGrantOperatorMult.bind(this, params);

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl.isFunctionAccessGrantOperator(
        param.functionAccessAdminRole,
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
    .filter((v) => v.name === 'FunctionAccessGrantOperatorUpdate')
    .map((v) => v.args);

  for (const [index, stateBefore] of statesBefore.entries()) {
    const param = params[index];

    if (stateBefore !== param.enabled) {
      const log = logs.filter(
        (log) =>
          log.functionAccessAdminRole === param.functionAccessAdminRole &&
          log.targetContract === param.targetContract &&
          log.functionSelector === param.functionSelector &&
          log.operator === param.operator &&
          log.enabled === param.enabled,
      );
      expect(log.length).eq(1);
      expect(log[0].enabled).eq(param.enabled);
    }

    expect(
      await accessControl.isFunctionAccessGrantOperator(
        param.functionAccessAdminRole,
        param.targetContract,
        param.functionSelector,
        param.operator,
      ),
    ).eq(param.enabled);
  }
};

export const setFunctionPermissionTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  params: {
    functionAccessAdminRole: string;
    targetContract: string;
    functionSelector: string;
    account: string;
    enabled: boolean;
  }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl
    .connect(from)
    .setFunctionPermissionMult.bind(this, params);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl[
        'hasFunctionPermission(bytes32,address,bytes4,address)'
      ](
        param.functionAccessAdminRole,
        param.targetContract,
        param.functionSelector,
        param.account,
      );
    }),
  );

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const logs = txReceipt.logs
    .filter((log) => log.address === accessControl.address)
    .map((log) => accessControl.interface.parseLog(log))
    .filter((v) => v.name === 'FunctionPermissionUpdate')
    .map((v) => v.args);

  for (const [index, stateBefore] of statesBefore.entries()) {
    const param = params[index];

    if (stateBefore !== param.enabled) {
      const log = logs.filter(
        (log) =>
          log.functionAccessAdminRole === param.functionAccessAdminRole &&
          log.targetContract === param.targetContract &&
          log.functionSelector === param.functionSelector &&
          log.account === param.account &&
          log.enabled === param.enabled,
      );
      expect(log.length).eq(1);
      expect(log[0].enabled).eq(param.enabled);
    }

    expect(
      await accessControl[
        'hasFunctionPermission(bytes32,address,bytes4,address)'
      ](
        param.functionAccessAdminRole,
        param.targetContract,
        param.functionSelector,
        param.account,
      ),
    ).eq(param.enabled);
  }
};

type SetupFunctionAccessGrantOperatorParams = {
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
  functionAccessAdminRole: string;
  targetContract: string;
  functionSelector: string;
  grantOperator: SignerWithAddress;
};

export const setupFunctionAccessGrantOperator = async ({
  accessControl,
  owner,
  functionAccessAdminRole,
  targetContract,
  functionSelector,
  grantOperator,
}: SetupFunctionAccessGrantOperatorParams) => {
  await setFunctionAccessAdminRoleEnabledTester({ accessControl, owner }, [
    { functionAccessAdminRole, enabled: true },
  ]);
  await setFunctionAccessGrantOperatorTester({ accessControl, owner }, [
    {
      functionAccessAdminRole,
      targetContract,
      functionSelector,
      operator: grantOperator.address,
      enabled: true,
    },
  ]);
};

export const setupVaultScopedFunctionPermission = async (
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
  await setupFunctionAccessGrantOperator({
    accessControl,
    owner,
    functionAccessAdminRole: vaultRole,
    targetContract: vaultAddress,
    functionSelector: selector,
    grantOperator: owner,
  });
  await setFunctionPermissionTester({ accessControl, owner }, [
    {
      functionAccessAdminRole: vaultRole,
      targetContract: vaultAddress,
      functionSelector: selector,
      account,
      enabled: true,
    },
  ]);
};
