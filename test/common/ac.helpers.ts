import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants, Contract } from 'ethers';

import {
  Account,
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
  handleRevert,
} from './common.helpers';
import {
  executeTimelockOperationTester,
  bulkScheduleTimelockOperationTester,
} from './timelock-manager.helpers';

import { encodeFnSelector } from '../../helpers/utils';
import {
  Blacklistable,
  Greenlistable,
  IMidasAccessControlManaged__factory,
  MidasAccessControl,
  MidasAccessControlTimelockController,
  MidasTimelockManager,
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

export const NULL_DELAY = 0;
// uint32 max value
export const NO_DELAY = BigNumber.from('0xFFFFFFFF');

export const acErrors = {
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
  account: AccountOrContract,
  opt?: OptionalCommonParams,
) => {
  await grantRoleTester(
    { accessControl, owner },
    await blacklistable.BLACKLISTED_ROLE(),
    account,
    0,
    opt,
  );
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
  account: AccountOrContract,
  opt?: OptionalCommonParams,
) => {
  await grantRoleTester(
    { accessControl, owner },
    role ?? (await greenlistable.GREENLISTED_ROLE()),
    account,
    0,
    opt,
  );
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
  params: {
    role: string;
    account: string;
    delay?: BigNumberish;
  }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl.connect(from).grantRoleMult.bind(
    this,
    params.map((param) => ({
      ...param,
      delay: param.delay ?? 0,
    })),
  );

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, { account, role, delay }] of params.entries()) {
    expect(await accessControl.hasRole(role, account)).eq(true);
    if (delay !== undefined && BigNumber.from(delay).gt(0)) {
      const [actualDelay] = await accessControl.getRoleTimelockDelay(role, 0);
      expect(actualDelay).eq(delay);
    }
  }
};

export const revokeRoleMultTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  params: {
    role: string;
    account: string;
  }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl.connect(from).revokeRoleMult.bind(this, params);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [, { role, account }] of params.entries()) {
    expect(await accessControl.hasRole(role, account)).eq(false);
  }
};

export const grantRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  role: string,
  account: AccountOrContract,
  delay?: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  account = getAccount(account);

  const callFn =
    delay === undefined
      ? accessControl
          .connect(from)
          ['grantRole(bytes32,address)'].bind(this, role, account)
      : accessControl
          .connect(from)
          ['grantRole(bytes32,address,uint32)'].bind(
            this,
            role,
            account,
            delay,
          );

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  expect(await accessControl.hasRole(role, account)).eq(true);

  if (delay !== undefined && BigNumber.from(delay).gt(0)) {
    const [actualDelay] = await accessControl.getRoleTimelockDelay(role, 0);
    expect(actualDelay).eq(delay);
  }
};

export const revokeRoleTester = async (
  {
    accessControl,
    owner,
  }: { accessControl: MidasAccessControl; owner: SignerWithAddress },
  role: string,
  account: AccountOrContract,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  account = getAccount(account);
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
  targetContract: string,
  params: {
    functionSelector: string;
    operator: string;
    enabled: boolean;
    delay?: BigNumberish;
  }[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = accessControl.connect(from).setGrantOperatorRoleMult.bind(
    this,
    targetContract,
    params.map((param) => ({
      ...param,
      delay: param.delay ?? 0,
    })),
  );

  const masterRole = params.length
    ? await IMidasAccessControlManaged__factory.connect(
        targetContract,
        accessControl.provider,
      ).contractAdminRole()
    : constants.HashZero;

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl[
        'isFunctionAccessGrantOperator(bytes32,address,bytes4,address)'
      ](masterRole, targetContract, param.functionSelector, param.operator);
    }),
  );

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
          log.targetContract === targetContract &&
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
      ](masterRole, targetContract, param.functionSelector, param.operator),
    ).eq(param.enabled);

    if (param.delay !== undefined && BigNumber.from(param.delay).gt(0)) {
      const operatorKey = await accessControl.grantOperatorRoleKey(
        masterRole,
        targetContract,
        param.functionSelector,
      );
      const [actualDelay] = await accessControl.getRoleTimelockDelay(
        operatorKey,
        0,
      );
      expect(actualDelay).eq(param.delay);
    }
  }
};

export const setPermissionRoleTester = async (
  {
    accessControl,
    owner,
  }: {
    accessControl: MidasAccessControl;
    owner: SignerWithAddress;
  },
  masterRole: string | undefined,
  targetContract: string,
  functionSelector: string,
  params: {
    account: string;
    enabled: boolean;
  }[],
  delay?: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const callFn = masterRole
    ? accessControl
        .connect(from)
        [
          'setPermissionRoleMult(bytes32,address,bytes4,uint32,(address,bool)[])'
        ].bind(
          this,
          masterRole,
          targetContract,
          functionSelector,
          delay ?? 0,
          params,
        )
    : accessControl
        .connect(from)
        ['setPermissionRoleMult(address,bytes4,uint32,(address,bool)[])'].bind(
          this,
          targetContract,
          functionSelector,
          delay ?? 0,
          params,
        );

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  masterRole =
    masterRole ??
    (await IMidasAccessControlManaged__factory.connect(
      targetContract,
      accessControl.provider,
    ).contractAdminRole());

  const statesBefore = await Promise.all(
    params.map(async (param) => {
      return await accessControl[
        'hasFunctionPermission(bytes32,address,bytes4,address)'
      ](masterRole, targetContract, functionSelector, param.account);
    }),
  );

  const txPromise = callFn();
  await expect(txPromise).to.not.reverted;

  const txReceipt = await (await txPromise).wait();
  const logs = txReceipt.logs
    .filter((log) => log.address === accessControl.address)
    .map((log) => accessControl.interface.parseLog(log))
    .filter((v) => v.name === 'SetPermissionRole')
    .map((v) => v.args);

  const key = await accessControl.permissionRoleKey(
    masterRole,
    targetContract,
    functionSelector,
  );

  if (delay !== undefined && BigNumber.from(delay).gt(0)) {
    const [actualDelay] = await accessControl.getRoleTimelockDelay(key, 0);
    expect(actualDelay).eq(delay);
  }

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
  // TODO: remove it
  masterRole: string;
  targetContract: string;
  functionSelector: string;
  grantOperator: SignerWithAddress;
};

export const setupGrantOperatorRole = async ({
  accessControl,
  owner,
  targetContract,
  functionSelector,
  grantOperator,
}: SetupFunctionAccessGrantOperatorParams) => {
  await setGrantOperatorRoleTester({ accessControl, owner }, targetContract, [
    {
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
type CommonParamsAccessControl = {
  timelockManager: MidasTimelockManager;
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
  timelock: MidasAccessControlTimelockController;
};

// TODO: refactor, role and delays should be an array of objects
export const setRoleTimelocksTester = async (
  { accessControl, owner }: CommonParamsAccessControl,
  roles: string[],
  delays: BigNumberish[],
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  const params = roles.map((role, index) => ({
    role,
    delay: delays[index],
  }));

  const callFn = accessControl
    .connect(from)
    .setRoleDelayMult.bind(this, params);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  for (const [index, role] of roles.entries()) {
    const delayParam = delays[index];
    const [delay, isDefault] = await accessControl.getRoleTimelockDelay(
      role,
      0,
    );
    const expectedDelay = BigNumber.from(0).eq(delayParam)
      ? 3600
      : NO_DELAY.eq(delayParam)
      ? 0
      : delayParam;

    expect(delay).eq(expectedDelay);
    expect(isDefault).eq(BigNumber.from(0).eq(delayParam));
  }
};

export const setRoleTimelocksAndExecute = async (
  {
    owner,
    accessControl,
    timelock,
    timelockManager,
  }: CommonParamsAccessControl,
  params: {
    role: string;
    delay: BigNumberish;
  }[],
  opt?: OptionalCommonParams,
) => {
  const [delay] = await accessControl.getRoleTimelockDelay(
    constants.HashZero,
    0,
  );

  const data = accessControl.interface.encodeFunctionData('setRoleDelayMult', [
    params,
  ]);

  const from = opt?.from ?? owner;

  await bulkScheduleTimelockOperationTester(
    { timelockManager, timelock, owner, accessControl },
    [accessControl.address],
    [data],
    { isSetCouncilOperation: false },
    { from },
  );
  await increase(delay + 1);
  await executeTimelockOperationTester(
    { timelockManager, timelock, owner, accessControl },
    accessControl.address,
    data,
    from.address,
    { from },
  );
};

export const setDefaultDelayTest = async (
  { accessControl, owner }: CommonParamsAccessControl,
  defaultDelay: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  const callFn = accessControl
    .connect(from)
    .setDefaultDelay.bind(this, defaultDelay);

  if (await handleRevert(callFn, accessControl, opt)) {
    return;
  }

  await expect(callFn()).to.not.reverted;

  expect(await accessControl.defaultDelay()).to.eq(defaultDelay);
};
