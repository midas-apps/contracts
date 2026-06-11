import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, Contract } from 'ethers';

import { encodeFnSelector } from '../../helpers/utils';
import {
  MidasAccessControl,
  MidasAccessControlTimelockController,
  MidasPauseManager,
} from '../../typechain-types';
import {
  acErrors,
  NO_DELAY,
  NULL_DELAY,
  setPermissionRoleTester,
  setRoleTimelocksTester,
  setupGrantOperatorRole,
} from '../common/ac.helpers';
import {
  adminPauseContractTest,
  adminUnpauseContractTest,
  pauseGlobalTest,
  pauseVault,
  pauseVaultFn,
  unpauseGlobalTest,
  unpauseVault,
  unpauseVaultFn,
} from '../common/common.helpers';
import { defaultDeploy } from '../common/fixtures';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
} from '../common/timelock-manager.helpers';

const DEFAULT_UNPAUSE_DELAY = 86400;
const DELAY_FOR_SET_DELAY = 2 * 24 * 3600;
const ROLE_TIMELOCK_DELAY = 3600;
const CUSTOM_DELAY = 3600;

type TimelockCtx = {
  pauseManager: MidasPauseManager;
  timelockManager: Awaited<ReturnType<typeof defaultDeploy>>['timelockManager'];
  timelock: MidasAccessControlTimelockController;
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
};

const timelockParams = (ctx: TimelockCtx) => ({
  timelockManager: ctx.timelockManager,
  timelock: ctx.timelock,
  accessControl: ctx.accessControl,
  owner: ctx.owner,
});

const scheduleAndExecute = async (
  ctx: TimelockCtx,
  calldata: string,
  delay: number,
  from: SignerWithAddress = ctx.owner,
  executeOpt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const timelockCtx = timelockParams(ctx);

  await scheduleTimelockOperationsTester(
    timelockCtx,
    [ctx.pauseManager.address],
    [calldata],
    {},
    { from },
  );
  await increase(delay);
  await executeTimelockOperationTester(
    timelockCtx,
    ctx.pauseManager.address,
    calldata,
    from.address,
    executeOpt,
  );
};

const unpauseContractsViaTimelock = async (
  ctx: TimelockCtx,
  addresses: string[],
  from: SignerWithAddress = ctx.owner,
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContract',
    [addresses],
  );
  await scheduleAndExecute(ctx, calldata, DEFAULT_UNPAUSE_DELAY, from);
};

const unpauseGlobalViaTimelock = async (
  ctx: TimelockCtx,
  from: SignerWithAddress = ctx.owner,
) => {
  const calldata =
    ctx.pauseManager.interface.encodeFunctionData('globalUnpause');
  await scheduleAndExecute(ctx, calldata, DEFAULT_UNPAUSE_DELAY, from);
};

const unpauseContractFnsViaTimelock = async (
  ctx: TimelockCtx,
  addresses: string[],
  selectors: string[],
  from: SignerWithAddress = ctx.owner,
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContractFn',
    [addresses, selectors],
  );
  await scheduleAndExecute(ctx, calldata, DEFAULT_UNPAUSE_DELAY, from);
};

const contractAdminUnpauseViaTimelock = async (
  ctx: TimelockCtx,
  contract: Contract,
  from: SignerWithAddress = ctx.owner,
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'contractAdminUnpause',
    [contract.address],
  );
  await scheduleAndExecute(ctx, calldata, DEFAULT_UNPAUSE_DELAY, from);
};

const setPauseDelayViaTimelock = async (
  ctx: TimelockCtx,
  newDelay: number,
  from: SignerWithAddress = ctx.owner,
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'setPauseDelay',
    [newDelay],
  );
  await scheduleAndExecute(ctx, calldata, DELAY_FOR_SET_DELAY, from);
};

const setUnpauseDelayViaTimelock = async (
  ctx: TimelockCtx,
  newDelay: BigNumberish,
  from: SignerWithAddress = ctx.owner,
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'setUnpauseDelay',
    [newDelay],
  );
  await scheduleAndExecute(ctx, calldata, DELAY_FOR_SET_DELAY, from);
};

const grantContractPauser = async (
  accessControl: MidasAccessControl,
  pausableTester: Contract,
  account: SignerWithAddress,
) => {
  const role = await pausableTester.contractAdminRole();
  await accessControl['grantRole(bytes32,address)'](role, account.address);
};

const toTimelockCtx = (
  fixture: Awaited<ReturnType<typeof defaultDeploy>>,
): TimelockCtx => ({
  pauseManager: fixture.pauseManager,
  timelockManager: fixture.timelockManager,
  timelock: fixture.timelock,
  accessControl: fixture.accessControl,
  owner: fixture.owner,
});

const scheduleGlobalPause = async (
  ctx: TimelockCtx,
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData('globalPause');
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const scheduleGlobalUnpause = async (
  ctx: TimelockCtx,
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata =
    ctx.pauseManager.interface.encodeFunctionData('globalUnpause');
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeGlobalPause = async (
  ctx: TimelockCtx,
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData('globalPause');
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const executeGlobalUnpause = async (
  ctx: TimelockCtx,
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata =
    ctx.pauseManager.interface.encodeFunctionData('globalUnpause');
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const setPauseAdminRoleTimelock = async (
  fixture: Awaited<ReturnType<typeof defaultDeploy>>,
  delay: number = ROLE_TIMELOCK_DELAY,
) => {
  const pauseAdminRole = await fixture.pauseManager.pauseAdminRole();
  await setRoleTimelocksTester(
    {
      timelockManager: fixture.timelockManager,
      timelock: fixture.timelock,
      owner: fixture.owner,
      accessControl: fixture.accessControl,
    },
    [pauseAdminRole],
    [delay],
  );
};

const setContractPauserRoleTimelock = async (
  fixture: Awaited<ReturnType<typeof defaultDeploy>>,
  delay: number = ROLE_TIMELOCK_DELAY,
) => {
  const contractPauserRole = await fixture.pausableTester.contractAdminRole();
  await setRoleTimelocksTester(
    {
      timelockManager: fixture.timelockManager,
      timelock: fixture.timelock,
      owner: fixture.owner,
      accessControl: fixture.accessControl,
    },
    [contractPauserRole],
    [delay],
  );
};

const BULK_PAUSE_CONTRACT_SEL = encodeFnSelector(
  'bulkPauseContract(address[])',
);
const BULK_UNPAUSE_CONTRACT_SEL = encodeFnSelector(
  'bulkUnpauseContract(address[])',
);
const BULK_PAUSE_CONTRACT_FN_SEL = encodeFnSelector(
  'bulkPauseContractFn(address[],bytes4[])',
);
const BULK_UNPAUSE_CONTRACT_FN_SEL = encodeFnSelector(
  'bulkUnpauseContractFn(address[],bytes4[])',
);
const CONTRACT_ADMIN_PAUSE_SEL = encodeFnSelector(
  'contractAdminPause(address)',
);
const CONTRACT_ADMIN_UNPAUSE_SEL = encodeFnSelector(
  'contractAdminUnpause(address)',
);
const DEPOSIT_REQUEST_SEL = encodeFnSelector(
  'depositRequest(address,uint256,bytes32)',
);

const noTimelockDelayRevert = (
  fixture: Awaited<ReturnType<typeof defaultDeploy>>,
) => ({
  revertCustomError: {
    contract: fixture.timelockManager,
    customErrorName: 'NoTimelockDelayForRole',
  },
});

const pauseAdminFunctionNotReady = async (
  fixture: Awaited<ReturnType<typeof defaultDeploy>>,
  selector: string,
) => ({
  revertCustomError: {
    contract: fixture.accessControl,
    customErrorName: 'FunctionNotReady',
    args: [await fixture.pauseManager.pauseAdminRole(), selector],
  },
});

const contractPauserFunctionNotReady = async (
  fixture: Awaited<ReturnType<typeof defaultDeploy>>,
  selector: string,
) => ({
  revertCustomError: {
    contract: fixture.accessControl,
    customErrorName: 'FunctionNotReady',
    args: [await fixture.pausableTester.contractAdminRole(), selector],
  },
});

const scheduleBulkPauseContract = async (
  ctx: TimelockCtx,
  addresses: string[],
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkPauseContract',
    [addresses],
  );
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeBulkPauseContract = async (
  ctx: TimelockCtx,
  addresses: string[],
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkPauseContract',
    [addresses],
  );
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const scheduleBulkUnpauseContract = async (
  ctx: TimelockCtx,
  addresses: string[],
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContract',
    [addresses],
  );
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeBulkUnpauseContract = async (
  ctx: TimelockCtx,
  addresses: string[],
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContract',
    [addresses],
  );
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const scheduleBulkPauseContractFn = async (
  ctx: TimelockCtx,
  addresses: string[],
  selectors: string[],
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkPauseContractFn',
    [addresses, selectors],
  );
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeBulkPauseContractFn = async (
  ctx: TimelockCtx,
  addresses: string[],
  selectors: string[],
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkPauseContractFn',
    [addresses, selectors],
  );
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const scheduleBulkUnpauseContractFn = async (
  ctx: TimelockCtx,
  addresses: string[],
  selectors: string[],
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContractFn',
    [addresses, selectors],
  );
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeBulkUnpauseContractFn = async (
  ctx: TimelockCtx,
  addresses: string[],
  selectors: string[],
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'bulkUnpauseContractFn',
    [addresses, selectors],
  );
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const scheduleContractAdminPause = async (
  ctx: TimelockCtx,
  contractAddr: string,
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'contractAdminPause',
    [contractAddr],
  );
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeContractAdminPause = async (
  ctx: TimelockCtx,
  contractAddr: string,
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'contractAdminPause',
    [contractAddr],
  );
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

const scheduleContractAdminUnpause = async (
  ctx: TimelockCtx,
  contractAddr: string,
  opt?: Parameters<typeof scheduleTimelockOperationsTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'contractAdminUnpause',
    [contractAddr],
  );
  await scheduleTimelockOperationsTester(
    timelockParams(ctx),
    [ctx.pauseManager.address],
    [calldata],
    {},
    opt,
  );
};

const executeContractAdminUnpause = async (
  ctx: TimelockCtx,
  contractAddr: string,
  opt?: Parameters<typeof executeTimelockOperationTester>[4],
) => {
  const calldata = ctx.pauseManager.interface.encodeFunctionData(
    'contractAdminUnpause',
    [contractAddr],
  );
  await executeTimelockOperationTester(
    timelockParams(ctx),
    ctx.pauseManager.address,
    calldata,
    ctx.owner.address,
    opt,
  );
};

describe('MidasPauseManager', () => {
  describe('globalPause()', () => {
    it('should fail: when caller doesnt have pause admin role', async () => {
      const { pauseManager, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await pauseGlobalTest(
        { pauseManager, owner },
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('call from pause admin when already paused', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await pauseGlobalTest({ pauseManager, owner });
    });

    it('call from pause admin', async () => {
      const { pauseManager, owner } = await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
    });

    it('when pause admin has function scoped timelock', async () => {
      const {
        accessControl,
        pauseManager,
        owner,
        regularAccounts,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      const globalPauseSel = encodeFnSelector('globalPause()');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: globalPauseSel,
        grantOperator: owner,
      });
      await setPermissionRoleTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        globalPauseSel,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [3600],
      );

      await pauseGlobalTest(
        { pauseManager, owner },
        { from: regularAccounts[0] },
      );
    });

    it('should fail: when pause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await scheduleGlobalPause(ctx, {
        revertCustomError: {
          contract: fixture.timelockManager,
          customErrorName: 'NoTimelockDelayForRole',
        },
      });
    });

    it('when pause delay is changed to custom delay, globalPause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await scheduleGlobalPause(ctx);
      await increase(CUSTOM_DELAY);
      await executeGlobalPause(ctx);
    });

    it('should fail: when pause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);

      await pauseGlobalTest(fixture, {
        revertCustomError: {
          contract: fixture.accessControl,
          customErrorName: 'FunctionNotReady',
          args: [
            await fixture.pauseManager.pauseAdminRole(),
            encodeFnSelector('globalPause()'),
          ],
        },
      });
    });

    it('when pause delay is changed to null_delay, globalPause uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, NULL_DELAY);
      await setPauseAdminRoleTimelock(fixture);
      await scheduleGlobalPause(ctx);
      await increase(ROLE_TIMELOCK_DELAY);
      await executeGlobalPause(ctx);
    });
  });

  describe('globalUnpause()', () => {
    it('should fail: when caller doesnt have pause admin role', async () => {
      const { pauseManager, regularAccounts, ...timelockFixture } =
        await loadFixture(defaultDeploy);

      const calldata =
        pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        timelockFixture,
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('call from pause admin when not paused', async () => {
      const fixture = await loadFixture(defaultDeploy);
      await unpauseGlobalViaTimelock(fixture);
    });

    it('when unpause delay is set, unpause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await pauseGlobalTest(fixture);
      await unpauseGlobalViaTimelock(fixture);
    });

    it('should fail: when trying to call directly before delay', async () => {
      const { pauseManager, owner, accessControl } = await loadFixture(
        defaultDeploy,
      );

      await pauseGlobalTest({ pauseManager, owner });

      await unpauseGlobalTest(
        { pauseManager, owner },
        {
          revertCustomError: {
            contract: accessControl,
            customErrorName: 'FunctionNotReady',
            args: [
              await pauseManager.pauseAdminRole(),
              encodeFnSelector('globalUnpause()'),
            ],
          },
        },
      );
    });

    it('when unpause delay is changed to no_delay, globalUnpause can be called directly', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await pauseGlobalTest(fixture);
      await unpauseGlobalTest(fixture);
    });

    it('should fail: when unpause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await pauseGlobalTest(fixture);

      await scheduleGlobalUnpause(ctx, {
        revertCustomError: {
          contract: fixture.timelockManager,
          customErrorName: 'NoTimelockDelayForRole',
        },
      });
    });

    it('when unpause delay is changed to null_delay, globalUnpause uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NULL_DELAY);
      await setPauseAdminRoleTimelock(fixture);
      await pauseGlobalTest(fixture);
      await scheduleGlobalUnpause(ctx);
      await increase(ROLE_TIMELOCK_DELAY);
      await executeGlobalUnpause(ctx);
    });

    it('when unpause delay is changed to custom delay, globalUnpause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await pauseGlobalTest(fixture);
      await scheduleGlobalUnpause(ctx);
      await increase(CUSTOM_DELAY);
      await executeGlobalUnpause(ctx);
    });

    it('should fail: when unpause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await pauseGlobalTest(fixture);

      await unpauseGlobalTest(fixture, {
        revertCustomError: {
          contract: fixture.accessControl,
          customErrorName: 'FunctionNotReady',
          args: [
            await fixture.pauseManager.pauseAdminRole(),
            encodeFnSelector('globalUnpause()'),
          ],
        },
      });
    });
  });

  describe('bulkPauseContract()', () => {
    it('should fail: when caller doesnt have pause admin role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when caller has only contract pauser role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        owner,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await grantContractPauser(
        accessControl,
        pausableTester,
        regularAccounts[0],
      );

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('call from pause admin when already paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
      await pauseVault({ pauseManager, owner }, pausableTester);
    });

    it('call from pause admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, pausableTester);
    });

    it('call from pause admin with multiple contracts', async () => {
      const { pausableTester, depositVault, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, [pausableTester, depositVault]);
    });

    it('when pause admin has function scoped timelock', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      const bulkPauseSel = encodeFnSelector('bulkPauseContract(address[])');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: bulkPauseSel,
        grantOperator: owner,
      });
      await setPermissionRoleTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        bulkPauseSel,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [3600],
      );

      await pauseVault({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
    });

    it('should fail: when pause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await scheduleBulkPauseContract(ctx, [fixture.pausableTester.address], {
        ...noTimelockDelayRevert(fixture),
      });
    });

    it('when pause delay is changed to custom delay, bulkPauseContract can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await scheduleBulkPauseContract(ctx, [fixture.pausableTester.address]);
      await increase(CUSTOM_DELAY);
      await executeBulkPauseContract(ctx, [fixture.pausableTester.address]);
    });

    it('should fail: when pause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);

      await pauseVault(fixture, fixture.pausableTester, {
        ...(await pauseAdminFunctionNotReady(fixture, BULK_PAUSE_CONTRACT_SEL)),
      });
    });

    it('when pause delay is changed to null_delay, bulkPauseContract uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, NULL_DELAY);
      await setPauseAdminRoleTimelock(fixture);
      await scheduleBulkPauseContract(ctx, [fixture.pausableTester.address]);
      await increase(ROLE_TIMELOCK_DELAY);
      await executeBulkPauseContract(ctx, [fixture.pausableTester.address]);
    });
  });

  describe('bulkUnpauseContract()', () => {
    it('should fail: when caller doesnt have pause admin role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        ...timelockFixture
      } = await loadFixture(defaultDeploy);

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContract',
        [[pausableTester.address]],
      );

      await scheduleTimelockOperationsTester(
        timelockFixture,
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when caller has only contract pauser role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        accessControl,
        ...timelockFixture
      } = await loadFixture(defaultDeploy);

      await grantContractPauser(
        accessControl,
        pausableTester,
        regularAccounts[0],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContract',
        [[pausableTester.address]],
      );

      await scheduleTimelockOperationsTester(
        { ...timelockFixture, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('call from pause admin when not paused', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await unpauseContractsViaTimelock(fixture, [
        fixture.pausableTester.address,
      ]);
    });

    it('when unpause delay is set, unpause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await pauseVault(fixture, fixture.pausableTester);
      await unpauseContractsViaTimelock(fixture, [
        fixture.pausableTester.address,
      ]);
    });

    it('should fail: when trying to call directly before delay', async () => {
      const { pausableTester, pauseManager, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, pausableTester);

      await unpauseVault({ pauseManager, owner }, pausableTester, {
        revertCustomError: {
          contract: accessControl,
          customErrorName: 'FunctionNotReady',
          args: [
            await pauseManager.pauseAdminRole(),
            BULK_UNPAUSE_CONTRACT_SEL,
          ],
        },
      });
    });

    it('when unpause delay is changed to no_delay, bulkUnpauseContract can be called directly', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await pauseVault(fixture, fixture.pausableTester);
      await unpauseVault(fixture, fixture.pausableTester);
    });

    it('should fail: when unpause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await pauseVault(fixture, fixture.pausableTester);

      await scheduleBulkUnpauseContract(ctx, [fixture.pausableTester.address], {
        ...noTimelockDelayRevert(fixture),
      });
    });

    it('when unpause delay is changed to null_delay, bulkUnpauseContract uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NULL_DELAY);
      await setPauseAdminRoleTimelock(fixture);
      await pauseVault(fixture, fixture.pausableTester);
      await scheduleBulkUnpauseContract(ctx, [fixture.pausableTester.address]);
      await increase(ROLE_TIMELOCK_DELAY);
      await executeBulkUnpauseContract(ctx, [fixture.pausableTester.address]);
    });

    it('when unpause delay is changed to custom delay, bulkUnpauseContract can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await pauseVault(fixture, fixture.pausableTester);
      await scheduleBulkUnpauseContract(ctx, [fixture.pausableTester.address]);
      await increase(CUSTOM_DELAY);
      await executeBulkUnpauseContract(ctx, [fixture.pausableTester.address]);
    });

    it('should fail: when unpause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await pauseVault(fixture, fixture.pausableTester);

      await unpauseVault(fixture, fixture.pausableTester, {
        ...(await pauseAdminFunctionNotReady(
          fixture,
          BULK_UNPAUSE_CONTRACT_SEL,
        )),
      });
    });
  });

  describe('bulkPauseContractFn()', () => {
    const depositRequestSel = DEPOSIT_REQUEST_SEL;

    it('should fail: when caller doesnt have pause admin role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when caller has only contract pauser role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        owner,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await grantContractPauser(
        accessControl,
        pausableTester,
        regularAccounts[0],
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('call from pause admin when already paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
      );
      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
      );
    });

    it('call from pause admin', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
      );
    });

    it('when pause admin has function scoped timelock', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      const bulkPauseFnSel = encodeFnSelector(
        'bulkPauseContractFn(address[],bytes4[])',
      );

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: pauseAdminRole,
        targetContract: pauseManager.address,
        functionSelector: bulkPauseFnSel,
        grantOperator: owner,
      });
      await setPermissionRoleTester(
        { accessControl, owner },
        pauseAdminRole,
        pauseManager.address,
        bulkPauseFnSel,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [pauseAdminRole],
        [3600],
      );

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
        { from: regularAccounts[0] },
      );
    });

    it('should fail: when pause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await scheduleBulkPauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
        noTimelockDelayRevert(fixture),
      );
    });

    it('when pause delay is changed to custom delay, bulkPauseContractFn can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await scheduleBulkPauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
      await increase(CUSTOM_DELAY);
      await executeBulkPauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
    });

    it('should fail: when pause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);

      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel, {
        ...(await pauseAdminFunctionNotReady(
          fixture,
          BULK_PAUSE_CONTRACT_FN_SEL,
        )),
      });
    });

    it('when pause delay is changed to null_delay, bulkPauseContractFn uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, NULL_DELAY);
      await setPauseAdminRoleTimelock(fixture);
      await scheduleBulkPauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
      await increase(ROLE_TIMELOCK_DELAY);
      await executeBulkPauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
    });
  });

  describe('bulkUnpauseContractFn()', () => {
    const depositRequestSel = DEPOSIT_REQUEST_SEL;

    it('should fail: when caller doesnt have pause admin role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        ...timelockFixture
      } = await loadFixture(defaultDeploy);

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [[pausableTester.address], [depositRequestSel]],
      );

      await scheduleTimelockOperationsTester(
        timelockFixture,
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when caller has only contract pauser role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        accessControl,
        ...timelockFixture
      } = await loadFixture(defaultDeploy);

      await grantContractPauser(
        accessControl,
        pausableTester,
        regularAccounts[0],
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'bulkUnpauseContractFn',
        [[pausableTester.address], [depositRequestSel]],
      );

      await scheduleTimelockOperationsTester(
        { ...timelockFixture, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('call from pause admin when not paused', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await unpauseContractFnsViaTimelock(
        fixture,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
    });

    it('when unpause delay is set, unpause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);
      await unpauseContractFnsViaTimelock(
        fixture,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
    });

    it('should fail: when trying to call directly before delay', async () => {
      const { pausableTester, pauseManager, owner, accessControl } =
        await loadFixture(defaultDeploy);

      await pauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
      );

      await unpauseVaultFn(
        { pauseManager, owner },
        pausableTester,
        depositRequestSel,
        {
          revertCustomError: {
            contract: accessControl,
            customErrorName: 'FunctionNotReady',
            args: [
              await pauseManager.pauseAdminRole(),
              BULK_UNPAUSE_CONTRACT_FN_SEL,
            ],
          },
        },
      );
    });

    it('when unpause delay is changed to no_delay, bulkUnpauseContractFn can be called directly', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);
      await unpauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);
    });

    it('should fail: when unpause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);

      await scheduleBulkUnpauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
        noTimelockDelayRevert(fixture),
      );
    });

    it('when unpause delay is changed to null_delay, bulkUnpauseContractFn uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NULL_DELAY);
      await setPauseAdminRoleTimelock(fixture);
      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);
      await scheduleBulkUnpauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
      await increase(ROLE_TIMELOCK_DELAY);
      await executeBulkUnpauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
    });

    it('when unpause delay is changed to custom delay, bulkUnpauseContractFn can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);
      await scheduleBulkUnpauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
      await increase(CUSTOM_DELAY);
      await executeBulkUnpauseContractFn(
        ctx,
        [fixture.pausableTester.address],
        [depositRequestSel],
      );
    });

    it('should fail: when unpause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await pauseVaultFn(fixture, fixture.pausableTester, depositRequestSel);

      await unpauseVaultFn(fixture, fixture.pausableTester, depositRequestSel, {
        ...(await pauseAdminFunctionNotReady(
          fixture,
          BULK_UNPAUSE_CONTRACT_FN_SEL,
        )),
      });
    });
  });

  describe('contractAdminPause()', () => {
    it('should fail: when caller doesnt have contract pauser role', async () => {
      const { pausableTester, regularAccounts, pauseManager, owner } =
        await loadFixture(defaultDeploy);

      await adminPauseContractTest({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when caller has only pause admin role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        owner,
        accessControl,
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await accessControl['grantRole(bytes32,address)'](
        pauseAdminRole,
        regularAccounts[0].address,
      );

      await adminPauseContractTest({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
      });
    });

    it('should fail: when role is user facing', async () => {
      const { pausableTester, pauseManager, owner, roles } = await loadFixture(
        defaultDeploy,
      );

      await pausableTester.setContractAdminRole(roles.common.greenlisted);

      await adminPauseContractTest({ pauseManager, owner }, pausableTester, {
        revertCustomError: {
          customErrorName: 'UserFacingRoleNotAllowed',
          args: [roles.common.greenlisted],
        },
      });
    });

    it('call from contract pauser when already paused', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await adminPauseContractTest({ pauseManager, owner }, pausableTester);
      await adminPauseContractTest({ pauseManager, owner }, pausableTester);
    });

    it('call from contract pauser', async () => {
      const { pausableTester, pauseManager, owner } = await loadFixture(
        defaultDeploy,
      );

      await adminPauseContractTest({ pauseManager, owner }, pausableTester);
    });

    it('when contract pauser has function scoped timelock', async () => {
      const {
        accessControl,
        pausableTester,
        owner,
        regularAccounts,
        pauseManager,
        timelockManager,
        timelock,
      } = await loadFixture(defaultDeploy);

      const contractPauserRole = await pausableTester.contractAdminRole();
      const pauseSel = encodeFnSelector('contractAdminPause(address)');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: contractPauserRole,
        targetContract: pauseManager.address,
        functionSelector: pauseSel,
        grantOperator: owner,
      });
      await setPermissionRoleTester(
        { accessControl, owner },
        contractPauserRole,
        pauseManager.address,
        pauseSel,
        [{ account: regularAccounts[0].address, enabled: true }],
      );

      await setRoleTimelocksTester(
        { timelockManager, timelock, owner, accessControl },
        [contractPauserRole],
        [3600],
      );

      await adminPauseContractTest({ pauseManager, owner }, pausableTester, {
        from: regularAccounts[0],
      });
    });

    it('should fail: when pause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await scheduleContractAdminPause(
        ctx,
        fixture.pausableTester.address,
        noTimelockDelayRevert(fixture),
      );
    });

    it('when pause delay is changed to custom delay, contractAdminPause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await scheduleContractAdminPause(ctx, fixture.pausableTester.address);
      await increase(CUSTOM_DELAY);
      await executeContractAdminPause(ctx, fixture.pausableTester.address);
    });

    it('should fail: when pause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, CUSTOM_DELAY);

      await adminPauseContractTest(fixture, fixture.pausableTester, {
        ...(await contractPauserFunctionNotReady(
          fixture,
          CONTRACT_ADMIN_PAUSE_SEL,
        )),
      });
    });

    it('when pause delay is changed to null_delay, contractAdminPause uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setPauseDelayViaTimelock(ctx, NULL_DELAY);
      await setContractPauserRoleTimelock(fixture);
      await scheduleContractAdminPause(ctx, fixture.pausableTester.address);
      await increase(ROLE_TIMELOCK_DELAY);
      await executeContractAdminPause(ctx, fixture.pausableTester.address);
    });
  });

  describe('contractAdminUnpause()', () => {
    it('should fail: when caller doesnt have contract pauser role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        ...timelockFixture
      } = await loadFixture(defaultDeploy);

      const calldata = pauseManager.interface.encodeFunctionData(
        'contractAdminUnpause',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        timelockFixture,
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when caller has only pause admin role', async () => {
      const {
        pausableTester,
        regularAccounts,
        pauseManager,
        accessControl,
        ...timelockFixture
      } = await loadFixture(defaultDeploy);

      const pauseAdminRole = await pauseManager.pauseAdminRole();
      await accessControl['grantRole(bytes32,address)'](
        pauseAdminRole,
        regularAccounts[0].address,
      );

      const calldata = pauseManager.interface.encodeFunctionData(
        'contractAdminUnpause',
        [pausableTester.address],
      );

      await scheduleTimelockOperationsTester(
        { ...timelockFixture, accessControl },
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('call from contract pauser when not paused', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await contractAdminUnpauseViaTimelock(fixture, fixture.pausableTester);
    });

    it('when unpause delay is set, unpause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await adminPauseContractTest(fixture, fixture.pausableTester);
      await contractAdminUnpauseViaTimelock(fixture, fixture.pausableTester);
    });

    it('should fail: when trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await adminPauseContractTest(fixture, fixture.pausableTester);

      await adminUnpauseContractTest(fixture, fixture.pausableTester, {
        ...(await contractPauserFunctionNotReady(
          fixture,
          CONTRACT_ADMIN_UNPAUSE_SEL,
        )),
      });
    });

    it('when unpause delay is changed to no_delay, contractAdminUnpause can be called directly', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await adminPauseContractTest(fixture, fixture.pausableTester);
      await adminUnpauseContractTest(fixture, fixture.pausableTester);
    });

    it('should fail: when unpause delay is no_delay and trying to schedule through timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NO_DELAY);
      await adminPauseContractTest(fixture, fixture.pausableTester);

      await scheduleContractAdminUnpause(
        ctx,
        fixture.pausableTester.address,
        noTimelockDelayRevert(fixture),
      );
    });

    it('when unpause delay is changed to null_delay, contractAdminUnpause uses role timelock delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, NULL_DELAY);
      await setContractPauserRoleTimelock(fixture);
      await adminPauseContractTest(fixture, fixture.pausableTester);
      await scheduleContractAdminUnpause(ctx, fixture.pausableTester.address);
      await increase(ROLE_TIMELOCK_DELAY);
      await executeContractAdminUnpause(ctx, fixture.pausableTester.address);
    });

    it('when unpause delay is changed to custom delay, contractAdminUnpause can be scheduled on timelock', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await adminPauseContractTest(fixture, fixture.pausableTester);
      await scheduleContractAdminUnpause(ctx, fixture.pausableTester.address);
      await increase(CUSTOM_DELAY);
      await executeContractAdminUnpause(ctx, fixture.pausableTester.address);
    });

    it('should fail: when unpause delay is custom delay and trying to call directly before delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const ctx = toTimelockCtx(fixture);

      await setUnpauseDelayViaTimelock(ctx, CUSTOM_DELAY);
      await adminPauseContractTest(fixture, fixture.pausableTester);

      await adminUnpauseContractTest(fixture, fixture.pausableTester, {
        ...(await contractPauserFunctionNotReady(
          fixture,
          CONTRACT_ADMIN_UNPAUSE_SEL,
        )),
      });
    });
  });

  describe('setPauseDelay()', () => {
    it('should fail: when caller doesnt have pause admin role', async () => {
      const { pauseManager, regularAccounts, ...timelockFixture } =
        await loadFixture(defaultDeploy);

      const calldata = pauseManager.interface.encodeFunctionData(
        'setPauseDelay',
        [NO_DELAY],
      );

      await scheduleTimelockOperationsTester(
        timelockFixture,
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when trying to call directly before delay', async () => {
      const { pauseManager, owner, accessControl } = await loadFixture(
        defaultDeploy,
      );

      await expect(pauseManager.connect(owner).setPauseDelay(3600))
        .revertedWithCustomError(accessControl, 'FunctionNotReady')
        .withArgs(
          await pauseManager.pauseAdminRole(),
          encodeFnSelector('setPauseDelay(uint256)'),
        );
    });

    it('call from pause admin after delay', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setPauseDelayViaTimelock(fixture, 3600);
    });
  });

  describe('setUnpauseDelay()', () => {
    it('should fail: when caller doesnt have pause admin role', async () => {
      const { pauseManager, regularAccounts, ...timelockFixture } =
        await loadFixture(defaultDeploy);

      const calldata = pauseManager.interface.encodeFunctionData(
        'setUnpauseDelay',
        [DEFAULT_UNPAUSE_DELAY],
      );

      await scheduleTimelockOperationsTester(
        timelockFixture,
        [pauseManager.address],
        [calldata],
        {},
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: when trying to call directly before delay', async () => {
      const { pauseManager, owner, accessControl } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        pauseManager.connect(owner).setUnpauseDelay(DEFAULT_UNPAUSE_DELAY * 2),
      )
        .revertedWithCustomError(accessControl, 'FunctionNotReady')
        .withArgs(
          await pauseManager.pauseAdminRole(),
          encodeFnSelector('setUnpauseDelay(uint256)'),
        );
    });

    it('call from pause admin after delay', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await setUnpauseDelayViaTimelock(fixture, DEFAULT_UNPAUSE_DELAY * 2);
    });

    it('when unpause delay is changed, unpause uses new delay', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const newUnpauseDelay = DEFAULT_UNPAUSE_DELAY * 2;

      await setUnpauseDelayViaTimelock(fixture, newUnpauseDelay);
      await pauseGlobalTest(fixture);

      const calldata =
        fixture.pauseManager.interface.encodeFunctionData('globalUnpause');

      await scheduleTimelockOperationsTester(
        fixture,
        [fixture.pauseManager.address],
        [calldata],
      );
      await increase(DEFAULT_UNPAUSE_DELAY);

      await executeTimelockOperationTester(
        fixture,
        fixture.pauseManager.address,
        calldata,
        fixture.owner.address,
        {
          revertCustomError: {
            contract: fixture.timelockManager,
            customErrorName: 'TimelockOperationNotReady',
          },
        },
      );

      await increase(DEFAULT_UNPAUSE_DELAY);
      await executeTimelockOperationTester(
        fixture,
        fixture.pauseManager.address,
        calldata,
        fixture.owner.address,
      );
    });
  });
});
