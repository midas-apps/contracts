import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import {
  days,
  hours,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { mTokensMetadata } from '../../helpers/mtokens-metadata';
import { encodeFnSelector } from '../../helpers/utils';
import { MToken } from '../../typechain-types';
import {
  acErrors,
  blackList,
  NO_DELAY,
  setPermissionRoleTester,
  setRoleTimelocksTester,
  setupGrantOperatorRole,
  unBlackList,
} from '../common/ac.helpers';
import {
  adminPauseContractTest,
  pauseGlobalTest,
  pauseVault,
  pauseVaultFn,
} from '../common/common.helpers';
import { deployProxyContract } from '../common/deploy.helpers';
import {
  defaultDeploy,
  DefaultFixture,
  mTokenMinBalanceFixture,
  mTokenPermissionedFixture,
  mTokenPermissionedMinBalanceFixture,
} from '../common/fixtures';
import {
  burn,
  clawbackTest,
  decreaseMintRateLimitTest,
  increaseMintRateLimitTest,
  removeMintRateLimitTest,
  mint,
  setClawbackReceiverTest,
  setMetadataTest,
} from '../common/mtoken.helpers';
import {
  bulkScheduleTimelockOperationTester,
  executeTimelockOperationTester,
} from '../common/timelock-manager.helpers';

const DEFAULT_UNPAUSE_DELAY = 86400;

const MINT_SEL = encodeFnSelector('mint(address,uint256)');
const BURN_SEL = encodeFnSelector('burn(address,uint256)');
const MINT_GOVERNED_SEL = encodeFnSelector('mintGoverned(address,uint256)');
const BURN_GOVERNED_SEL = encodeFnSelector('burnGoverned(address,uint256)');
const TRANSFER_SEL = encodeFnSelector('transfer(address,uint256)');
const TRANSFER_FROM_SEL = encodeFnSelector(
  'transferFrom(address,address,uint256)',
);
const CLAWBACK_SEL = encodeFnSelector('clawback(uint256,address)');
const SET_METADATA_SEL = encodeFnSelector('setMetadata(bytes32,bytes)');
const SET_CLAWBACK_RECEIVER_SEL = encodeFnSelector(
  'setClawbackReceiver(address)',
);
const INCREASE_MINT_RATE_LIMIT_SEL = encodeFnSelector(
  'increaseMintRateLimit(uint256,uint256)',
);
const DECREASE_MINT_RATE_LIMIT_SEL = encodeFnSelector(
  'decreaseMintRateLimit(uint256,uint256)',
);
const REMOVE_MINT_RATE_LIMIT_SEL = encodeFnSelector(
  'removeMintRateLimitConfig(uint256)',
);
const ERC20_PAUSABLE_PAUSED_STORAGE_SLOT = 101;
export const ERC20_PAUSED_MSG = 'ERC20Pausable: token transfer while paused';
const PAUSE_TEST_AMOUNT = parseUnits('100');

const SET_NAME_SYMBOL_DELAY = 2 * 24 * 3600;
const SET_NAME_SYMBOL_SEL = encodeFnSelector('setNameSymbol(string,string)');
const SET_IS_PERMISSIONED_DELAY = SET_NAME_SYMBOL_DELAY;
const SET_IS_PERMISSIONED_SEL = encodeFnSelector('setIsPermissioned(bool)');
const SET_MIN_HOLDING_BALANCE_ENFORCED_DELAY = SET_NAME_SYMBOL_DELAY;
const SET_MIN_HOLDING_BALANCE_ENFORCED_SEL = encodeFnSelector(
  'setMinHoldingBalanceEnforced(bool)',
);

const toStorageSlotHex = (slot: number) =>
  '0x' + slot.toString(16).padStart(64, '0');

const PROXY_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

const setProxyAdmin = (address: string, admin: string) =>
  ethers.provider.send('hardhat_setStorageAt', [
    address,
    PROXY_ADMIN_SLOT,
    ethers.utils.hexZeroPad(admin, 32),
  ]);

const setInitializedVersion = (address: string, version: number) =>
  ethers.provider.send('hardhat_setStorageAt', [
    address,
    toStorageSlotHex(0),
    ethers.utils.hexZeroPad(ethers.utils.hexlify(version), 32),
  ]);

const toBoolWordHex = (value: boolean) =>
  '0x' + (value ? '1' : '0').padStart(64, '0');

export const setErc20PausablePaused = async (
  tokenContract: Contract,
  paused = true,
) => {
  await ethers.provider.send('hardhat_setStorageAt', [
    tokenContract.address,
    toStorageSlotHex(ERC20_PAUSABLE_PAUSED_STORAGE_SLOT),
    toBoolWordHex(paused),
  ]);
  expect(await tokenContract.paused()).eq(paused);
};

const pausedRevert = (tokenContract: MToken, selector: string) => ({
  revertCustomError: {
    customErrorName: 'Paused',
    args: [tokenContract.address, selector],
  },
});

const adminUnpauseContractViaTimelock = async (fixture: DefaultFixture) => {
  const { pauseManager, timelockManager, timelock, owner, accessControl } =
    fixture;
  const calldata = pauseManager.interface.encodeFunctionData(
    'contractAdminUnpause',
    [fixture.tokenContract.address],
  );

  await bulkScheduleTimelockOperationTester(
    { timelockManager, timelock, owner, accessControl },
    [pauseManager.address],
    [calldata],
  );
  await increase(DEFAULT_UNPAUSE_DELAY);
  await executeTimelockOperationTester(
    { timelockManager, timelock, owner, accessControl },
    pauseManager.address,
    calldata,
    owner.address,
  );
};

describe(`mToken`, function () {
  it('deployment', async () => {
    const { mTBILL } = await loadFixture(defaultDeploy);

    const expected = mTokensMetadata['mTBILL'];
    expect(await mTBILL.name()).eq(expected.name);
    expect(await mTBILL.symbol()).eq(expected.symbol);

    expect(await mTBILL.paused()).eq(false);

    const limits = await mTBILL.getMintRateLimitStatuses();

    expect(limits.length).eq(0);
  });

  it('roles', async () => {
    const { mTBILL, roles } = await loadFixture(defaultDeploy);

    const tokenRoles = roles.tokenRoles.mTBILL;

    expect(await mTBILL.burnerRole()).eq(tokenRoles.burner);
    expect(await mTBILL.minterRole()).eq(tokenRoles.minter);

    expect(await mTBILL.contractAdminRole()).eq(tokenRoles.tokenManager);
    expect(await mTBILL.greenlistedRole()).eq(tokenRoles.greenlisted);
    expect(await mTBILL.minBalanceExemptRole()).eq(tokenRoles.minBalanceExempt);
    expect(await mTBILL.isPermissioned()).eq(false);
    expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(false);
  });

  it('initialize and v2 initialize', async () => {
    const { tokenContract, clawbackReceiver } = await loadFixture(
      defaultDeploy,
    );

    await expect(
      tokenContract.initialize(
        ethers.constants.AddressZero,
        clawbackReceiver.address,
        false,
        false,
        mTokensMetadata.mTBILL.name,
        mTokensMetadata.mTBILL.symbol,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    await expect(
      tokenContract.initializeV2(clawbackReceiver.address, false, false),
    ).to.revertedWith('Initializable: contract is already initialized');
  });

  describe('initializeV2() proxy admin restriction', () => {
    const deployMToken = async () => {
      const { accessControl, clawbackReceiver } = await loadFixture(
        defaultDeploy,
      );

      const mTBILL = await deployProxyContract<MToken>(
        'mToken',
        [
          accessControl.address,
          clawbackReceiver.address,
          false,
          false,
          mTokensMetadata.mTBILL.name,
          mTokensMetadata.mTBILL.symbol,
        ],
        'initialize',
        [
          ethers.utils.id('M_TOKEN_MANAGER_ROLE'),
          ethers.utils.id('M_TOKEN_MINTER_ROLE'),
          ethers.utils.id('M_TOKEN_BURNER_ROLE'),
          ethers.utils.id('M_TOKEN_GREENLISTED_ROLE'),
          ethers.utils.id('M_TOKEN_MIN_BALANCE_EXEMPT_ROLE'),
        ],
      );

      return { mTBILL, clawbackReceiver };
    };

    it('fresh deploy: initializeV2 runs while proxy admin is zero', async () => {
      const { mTBILL, clawbackReceiver } = await deployMToken();

      expect(await mTBILL.clawbackReceiver()).eq(clawbackReceiver.address);
      expect(await mTBILL.isPermissioned()).eq(false);
      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(false);
    });

    it('fresh deploy: initializeV2 can enable feature flags', async () => {
      const { accessControl, clawbackReceiver } = await loadFixture(
        defaultDeploy,
      );

      const mTBILL = await deployProxyContract<MToken>(
        'mToken',
        [
          accessControl.address,
          clawbackReceiver.address,
          true,
          true,
          mTokensMetadata.mTBILL.name,
          mTokensMetadata.mTBILL.symbol,
        ],
        'initialize',
        [
          ethers.utils.id('M_TOKEN_MANAGER_ROLE'),
          ethers.utils.id('M_TOKEN_MINTER_ROLE'),
          ethers.utils.id('M_TOKEN_BURNER_ROLE'),
          ethers.utils.id('M_TOKEN_GREENLISTED_ROLE'),
          ethers.utils.id('M_TOKEN_MIN_BALANCE_EXEMPT_ROLE'),
        ],
      );

      expect(await mTBILL.isPermissioned()).eq(true);
      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(true);
    });

    it('should fail: when already reinitialized, even from the proxy admin', async () => {
      const [, admin] = await ethers.getSigners();
      const { mTBILL, clawbackReceiver } = await deployMToken();

      await setProxyAdmin(mTBILL.address, admin.address);

      await expect(
        mTBILL
          .connect(admin)
          .initializeV2(clawbackReceiver.address, false, false),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: when initialized and caller is not the proxy admin', async () => {
      const [, admin, stranger] = await ethers.getSigners();
      const { mTBILL, clawbackReceiver } = await deployMToken();

      await setProxyAdmin(mTBILL.address, admin.address);
      await setInitializedVersion(mTBILL.address, 1);

      await expect(
        mTBILL
          .connect(stranger)
          .initializeV2(clawbackReceiver.address, false, false),
      ).revertedWithCustomError(mTBILL, 'SenderNotProxyAdmin');
    });

    it('when initialized and caller is the proxy admin', async () => {
      const [, admin, newClawbackReceiver] = await ethers.getSigners();
      const { mTBILL } = await deployMToken();

      await setProxyAdmin(mTBILL.address, admin.address);
      await setInitializedVersion(mTBILL.address, 1);

      await mTBILL
        .connect(admin)
        .initializeV2(newClawbackReceiver.address, true, true);

      expect(await mTBILL.clawbackReceiver()).eq(newClawbackReceiver.address);
      expect(await mTBILL.isPermissioned()).eq(true);
      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(true);
    });
  });

  describe('setIsPermissioned()', () => {
    it('should fail: when called directly', async () => {
      const { mTBILL, accessControl, owner } = await loadFixture(defaultDeploy);

      const tokenManagerRole = await mTBILL.contractAdminRole();

      await expect(mTBILL.connect(owner).setIsPermissioned(true))
        .revertedWithCustomError(accessControl, 'SenderIsNotTimelock')
        .withArgs(tokenManagerRole, SET_IS_PERMISSIONED_SEL, owner.address);
    });

    it('should fail: call from address without token manager role', async () => {
      const { mTBILL, accessControl, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];
      const tokenManagerRole = await mTBILL.contractAdminRole();

      await expect(
        mTBILL.connect(caller).setIsPermissioned(true),
      ).revertedWithCustomError(accessControl, 'NoFunctionPermission');

      expect(await accessControl.hasRole(tokenManagerRole, caller.address)).eq(
        false,
      );
      expect(await mTBILL.isPermissioned()).eq(false);
    });

    it('should always require 2 days timelock even if contract admin/function admin role delay is different (no timelock for example)', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const tokenManagerRole = await mTBILL.contractAdminRole();
      const functionRoleKey = await accessControl.permissionRoleKey(
        tokenManagerRole,
        mTBILL.address,
        SET_IS_PERMISSIONED_SEL,
      );

      await setRoleTimelocksTester(
        { accessControl, owner, timelock, timelockManager },
        [tokenManagerRole, functionRoleKey],
        [NO_DELAY, NO_DELAY],
      );

      await expect(mTBILL.connect(owner).setIsPermissioned(true))
        .revertedWithCustomError(accessControl, 'SenderIsNotTimelock')
        .withArgs(tokenManagerRole, SET_IS_PERMISSIONED_SEL, owner.address);

      const calldata = mTBILL.interface.encodeFunctionData(
        'setIsPermissioned',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [calldata],
      );

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
        {
          revertCustomError: {
            contract: timelockManager,
            customErrorName: 'TimelockOperationNotReady',
          },
        },
      );

      await increase(SET_IS_PERMISSIONED_DELAY);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
      );

      expect(await mTBILL.isPermissioned()).eq(true);
    });

    it('when called through timelock manager with 2 days delay', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const calldata = mTBILL.interface.encodeFunctionData(
        'setIsPermissioned',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [calldata],
      );

      await increase(SET_IS_PERMISSIONED_DELAY);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
      );

      expect(await mTBILL.isPermissioned()).eq(true);
    });

    it('does not change state when setting the same value', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const enableCalldata = mTBILL.interface.encodeFunctionData(
        'setIsPermissioned',
        [true],
      );
      const sameValueCalldata = mTBILL.interface.encodeFunctionData(
        'setIsPermissioned',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [enableCalldata],
      );
      await increase(SET_IS_PERMISSIONED_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        enableCalldata,
        owner.address,
      );

      expect(await mTBILL.isPermissioned()).eq(true);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [sameValueCalldata],
      );
      await increase(SET_IS_PERMISSIONED_DELAY);

      const filter = mTBILL.filters.SetIsPermissioned();
      const eventsBefore = await mTBILL.queryFilter(filter);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        sameValueCalldata,
        owner.address,
      );

      const eventsAfter = await mTBILL.queryFilter(filter);
      expect(eventsAfter.length).eq(eventsBefore.length);
      expect(await mTBILL.isPermissioned()).eq(true);
    });

    it('disabling permissioned flag allows transfers without greenlist', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);
      const [, from, to] = await ethers.getSigners();

      const enableCalldata = mTBILL.interface.encodeFunctionData(
        'setIsPermissioned',
        [true],
      );
      const disableCalldata = mTBILL.interface.encodeFunctionData(
        'setIsPermissioned',
        [false],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [enableCalldata],
      );
      await increase(SET_IS_PERMISSIONED_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        enableCalldata,
        owner.address,
      );

      await mint({ tokenContract: mTBILL, owner }, from, parseUnits('1'), {
        revertCustomError: { customErrorName: 'NotGreenlisted' },
      });

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [disableCalldata],
      );
      await increase(SET_IS_PERMISSIONED_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        disableCalldata,
        owner.address,
      );

      await mint({ tokenContract: mTBILL, owner }, from, parseUnits('1'));
      await expect(mTBILL.connect(from).transfer(to.address, parseUnits('1')))
        .not.reverted;
    });
  });

  describe('setMinHoldingBalanceEnforced()', () => {
    it('should fail: when called directly', async () => {
      const { mTBILL, accessControl, owner } = await loadFixture(defaultDeploy);

      const tokenManagerRole = await mTBILL.contractAdminRole();

      await expect(mTBILL.connect(owner).setMinHoldingBalanceEnforced(true))
        .revertedWithCustomError(accessControl, 'SenderIsNotTimelock')
        .withArgs(
          tokenManagerRole,
          SET_MIN_HOLDING_BALANCE_ENFORCED_SEL,
          owner.address,
        );
    });

    it('should fail: call from address without token manager role', async () => {
      const { mTBILL, accessControl, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];
      const tokenManagerRole = await mTBILL.contractAdminRole();

      await expect(
        mTBILL.connect(caller).setMinHoldingBalanceEnforced(true),
      ).revertedWithCustomError(accessControl, 'NoFunctionPermission');

      expect(await accessControl.hasRole(tokenManagerRole, caller.address)).eq(
        false,
      );
      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(false);
    });

    it('should always require 2 days timelock even if contract admin/function admin role delay is different (no timelock for example)', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const tokenManagerRole = await mTBILL.contractAdminRole();
      const functionRoleKey = await accessControl.permissionRoleKey(
        tokenManagerRole,
        mTBILL.address,
        SET_MIN_HOLDING_BALANCE_ENFORCED_SEL,
      );

      await setRoleTimelocksTester(
        { accessControl, owner, timelock, timelockManager },
        [tokenManagerRole, functionRoleKey],
        [NO_DELAY, NO_DELAY],
      );

      await expect(mTBILL.connect(owner).setMinHoldingBalanceEnforced(true))
        .revertedWithCustomError(accessControl, 'SenderIsNotTimelock')
        .withArgs(
          tokenManagerRole,
          SET_MIN_HOLDING_BALANCE_ENFORCED_SEL,
          owner.address,
        );

      const calldata = mTBILL.interface.encodeFunctionData(
        'setMinHoldingBalanceEnforced',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [calldata],
      );

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
        {
          revertCustomError: {
            contract: timelockManager,
            customErrorName: 'TimelockOperationNotReady',
          },
        },
      );

      await increase(SET_MIN_HOLDING_BALANCE_ENFORCED_DELAY);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
      );

      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(true);
    });

    it('when called through timelock manager with 2 days delay', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const calldata = mTBILL.interface.encodeFunctionData(
        'setMinHoldingBalanceEnforced',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [calldata],
      );

      await increase(SET_MIN_HOLDING_BALANCE_ENFORCED_DELAY);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
      );

      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(true);
    });

    it('does not change state when setting the same value', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const enableCalldata = mTBILL.interface.encodeFunctionData(
        'setMinHoldingBalanceEnforced',
        [true],
      );
      const sameValueCalldata = mTBILL.interface.encodeFunctionData(
        'setMinHoldingBalanceEnforced',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [enableCalldata],
      );
      await increase(SET_MIN_HOLDING_BALANCE_ENFORCED_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        enableCalldata,
        owner.address,
      );

      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(true);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [sameValueCalldata],
      );
      await increase(SET_MIN_HOLDING_BALANCE_ENFORCED_DELAY);

      const filter = mTBILL.filters.SetIsMinHoldingBalanceEnforced();
      const eventsBefore = await mTBILL.queryFilter(filter);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        sameValueCalldata,
        owner.address,
      );

      const eventsAfter = await mTBILL.queryFilter(filter);
      expect(eventsAfter.length).eq(eventsBefore.length);
      expect(await mTBILL.isMinHoldingBalanceEnforced()).eq(true);
    });

    it('enabling min balance rejects dust mint to empty recipient', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);
      const [, to] = await ethers.getSigners();

      await mint({ tokenContract: mTBILL, owner }, to, parseUnits('0.5'));

      const enableCalldata = mTBILL.interface.encodeFunctionData(
        'setMinHoldingBalanceEnforced',
        [true],
      );

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [enableCalldata],
      );
      await increase(SET_MIN_HOLDING_BALANCE_ENFORCED_DELAY);
      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        enableCalldata,
        owner.address,
      );

      await mint(
        { tokenContract: mTBILL, owner },
        (
          await ethers.getSigners()
        )[2],
        parseUnits('0.5'),
        { revertMessage: 'MTMB: min balance not met' },
      );
    });
  });

  describe('setNameSymbol()', () => {
    it('should fail: when called directly', async () => {
      const { mTBILL, accessControl, owner } = await loadFixture(defaultDeploy);

      const tokenManagerRole = await mTBILL.contractAdminRole();
      const newName = 'Updated Token Name';
      const newSymbol = 'UPD';

      await expect(mTBILL.connect(owner).setNameSymbol(newName, newSymbol))
        .revertedWithCustomError(accessControl, 'SenderIsNotTimelock')
        .withArgs(tokenManagerRole, SET_NAME_SYMBOL_SEL, owner.address);
    });

    it('should always require 2 days timelock even if contract admin/function admin role delay is different (no timelock for example)', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const tokenManagerRole = await mTBILL.contractAdminRole();
      const functionRoleKey = await accessControl.permissionRoleKey(
        tokenManagerRole,
        mTBILL.address,
        SET_NAME_SYMBOL_SEL,
      );
      const newName = 'No Delay Override Name';
      const newSymbol = 'NDO';

      await setRoleTimelocksTester(
        { accessControl, owner, timelock, timelockManager },
        [tokenManagerRole, functionRoleKey],
        [NO_DELAY, NO_DELAY],
      );

      await expect(mTBILL.connect(owner).setNameSymbol(newName, newSymbol))
        .revertedWithCustomError(accessControl, 'SenderIsNotTimelock')
        .withArgs(tokenManagerRole, SET_NAME_SYMBOL_SEL, owner.address);

      const calldata = mTBILL.interface.encodeFunctionData('setNameSymbol', [
        newName,
        newSymbol,
      ]);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [calldata],
      );

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
        {
          revertCustomError: {
            contract: timelockManager,
            customErrorName: 'TimelockOperationNotReady',
          },
        },
      );

      await increase(SET_NAME_SYMBOL_DELAY);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
      );

      expect(await mTBILL.name()).eq(newName);
      expect(await mTBILL.symbol()).eq(newSymbol);
    });

    it('when called through timelock manager with 2 days delay', async () => {
      const { mTBILL, accessControl, owner, timelock, timelockManager } =
        await loadFixture(defaultDeploy);

      const newName = 'Timelock Updated Name';
      const newSymbol = 'TLUPD';
      const calldata = mTBILL.interface.encodeFunctionData('setNameSymbol', [
        newName,
        newSymbol,
      ]);

      await bulkScheduleTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        [mTBILL.address],
        [calldata],
      );

      await increase(SET_NAME_SYMBOL_DELAY);

      await executeTimelockOperationTester(
        { timelockManager, timelock, owner, accessControl },
        mTBILL.address,
        calldata,
        owner.address,
      );

      expect(await mTBILL.name()).eq(newName);
      expect(await mTBILL.symbol()).eq(newSymbol);
    });
  });

  describe('mint()', () => {
    it('should fail: call from address without "mint operator" role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await mint({ tokenContract, owner }, owner, 0, {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('call from address with "mint operator" role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ tokenContract, owner }, to, amount);
    });

    it('when 1h limit is set but not exceeded', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await increaseMintRateLimitTest(
        { tokenContract, owner },
        3600,
        parseUnits('10000'),
      );
      await mint({ tokenContract, owner }, to, amount);
    });

    it('when 1h and 10h limit is set but not exceeded', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await increaseMintRateLimitTest(
        { tokenContract, owner },
        3600,
        parseUnits('1000'),
      );
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        3600 * 10,
        parseUnits('10000'),
      );

      await mint({ tokenContract, owner }, to, amount);
    });

    it('should fail: amount exceeds mint rate limit', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const to = regularAccounts[0];
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await mint({ tokenContract, owner }, to, 100);
      await mint({ tokenContract, owner }, to, 1, {
        revertCustomError: {
          customErrorName: 'WindowLimitExceeded',
          args: [window, 0, 1],
        },
      });
    });

    it('should fail: one of multiple mint rate limits is exceeded', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const to = regularAccounts[0];
      const longWindow = days(1);
      const shortWindow = 60;

      await increaseMintRateLimitTest(
        { tokenContract, owner },
        longWindow,
        100,
      );
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        shortWindow,
        50,
      );

      await mint({ tokenContract, owner }, to, 60, {
        revertCustomError: {
          customErrorName: 'WindowLimitExceeded',
          args: [shortWindow, 50, 60],
        },
      });
    });

    describe('mint() sliding rate limit (RateLimitLibrary)', () => {
      const setupMintRateLimitFixture = async () => {
        const { owner, tokenContract, regularAccounts } = await loadFixture(
          defaultDeploy,
        );

        return {
          owner,
          tokenContract,
          holder: regularAccounts[0],
          recipient: regularAccounts[1],
        };
      };

      it('10h window: full consume, after 1h restores ~10% and second mint uses it', async () => {
        const { owner, tokenContract, holder } =
          await setupMintRateLimitFixture();

        await increaseMintRateLimitTest(
          { tokenContract, owner },
          hours(10),
          parseUnits('1000'),
        );

        await mint({ tokenContract, owner }, holder, parseUnits('1000'));

        await increase(hours(1));

        await mint({ tokenContract, owner }, holder, parseUnits('100'));
      });

      it('1d window: after 80% consumed and limit halved, mint fails', async () => {
        const { owner, tokenContract, holder } =
          await setupMintRateLimitFixture();

        const window = days(1);
        const initialLimit = parseUnits('1000');

        await increaseMintRateLimitTest(
          { tokenContract, owner },
          window,
          initialLimit,
        );

        await mint({ tokenContract, owner }, holder, parseUnits('800'));

        await decreaseMintRateLimitTest(
          { tokenContract, owner },
          window,
          initialLimit.div(2),
        );

        await mint({ tokenContract, owner }, holder, parseUnits('100'), {
          revertCustomError: {
            customErrorName: 'WindowLimitExceeded',
          },
        });
      });

      it('1d window: after limit halved, wait 12h and mint small amount', async () => {
        const { owner, tokenContract, holder } =
          await setupMintRateLimitFixture();

        const window = days(1);
        const initialLimit = parseUnits('1000');

        await increaseMintRateLimitTest(
          { tokenContract, owner },
          window,
          initialLimit,
        );

        await mint({ tokenContract, owner }, holder, parseUnits('800'));

        await decreaseMintRateLimitTest(
          { tokenContract, owner },
          window,
          initialLimit.div(2),
        );

        await mint({ tokenContract, owner }, holder, parseUnits('100'), {
          revertCustomError: {
            customErrorName: 'WindowLimitExceeded',
          },
        });

        await increase(hours(18));

        await mint({ tokenContract, owner }, holder, parseUnits('1'));
      });

      it('multiple windows active at the same time', async () => {
        const { owner, tokenContract, holder } =
          await setupMintRateLimitFixture();

        await increaseMintRateLimitTest(
          { tokenContract, owner },
          hours(1),
          parseUnits('100'),
        );
        await increaseMintRateLimitTest(
          { tokenContract, owner },
          hours(6),
          parseUnits('500'),
        );
        await increaseMintRateLimitTest(
          { tokenContract, owner },
          days(1),
          parseUnits('10000'),
        );

        await mint({ tokenContract, owner }, holder, parseUnits('100'));

        await mint({ tokenContract, owner }, holder, parseUnits('50'), {
          revertCustomError: {
            customErrorName: 'WindowLimitExceeded',
          },
        });

        await increase(hours(1));

        await mint({ tokenContract, owner }, holder, parseUnits('50'));
      });

      it('burn is not affected when mint rate limit is exhausted', async () => {
        const { owner, tokenContract, holder } =
          await setupMintRateLimitFixture();

        const window = days(1);

        await increaseMintRateLimitTest(
          { tokenContract, owner },
          window,
          parseUnits('100'),
        );

        await mint({ tokenContract, owner }, holder, parseUnits('100'));

        await mint({ tokenContract, owner }, holder, parseUnits('1'), {
          revertCustomError: {
            customErrorName: 'WindowLimitExceeded',
          },
        });

        await tokenContract
          .connect(owner)
          .burn(holder.address, parseUnits('50'));
      });

      it('transfer is not affected when mint rate limit is exhausted', async () => {
        const { owner, tokenContract, holder, recipient } =
          await setupMintRateLimitFixture();

        const window = days(1);

        await increaseMintRateLimitTest(
          { tokenContract, owner },
          window,
          parseUnits('100'),
        );

        await mint({ tokenContract, owner }, holder, parseUnits('100'));

        await mint({ tokenContract, owner }, holder, parseUnits('1'), {
          revertCustomError: {
            customErrorName: 'WindowLimitExceeded',
          },
        });

        await tokenContract
          .connect(holder)
          .transfer(recipient.address, parseUnits('50'));
      });
    });

    it('should fail: contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, tokenContract);
      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_SEL),
      );
    });

    it('should fail: mint is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVaultFn({ pauseManager, owner }, tokenContract, MINT_SEL);
      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_SEL),
      );
    });

    it('should fail: globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_SEL),
      );
    });

    it('should fail: contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_SEL),
      );
    });

    it('should fail: mint when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setErc20PausablePaused(tokenContract);
      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        { revertMessage: ERC20_PAUSED_MSG },
      );
    });

    it('mint after contract admin unpause by pause manager', async () => {
      const fixture = await loadFixture(defaultDeploy);

      await adminPauseContractTest(
        { pauseManager: fixture.pauseManager, owner: fixture.owner },
        fixture.tokenContract,
      );
      await adminUnpauseContractViaTimelock(fixture);
      await mint(
        { tokenContract: fixture.tokenContract, owner: fixture.owner },
        fixture.regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
    });
  });

  describe('burn()', () => {
    it('should fail: call from address without "burn operator" role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];

      await burn({ tokenContract, owner }, owner, 0, {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: call when user has insufficient balance', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await burn({ tokenContract, owner }, to, amount, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('call from address with "mint operator" role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ tokenContract, owner }, to, amount);
      await burn({ tokenContract, owner }, to, amount);
    });

    it('burn is not affected by mint rate limits', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const holder = regularAccounts[0];
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await mint({ tokenContract, owner }, holder, 100);
      await mint({ tokenContract, owner }, holder, 1, {
        revertCustomError: {
          customErrorName: 'WindowLimitExceeded',
          args: [window, 0, 1],
        },
      });

      await burn({ tokenContract, owner }, holder, 50);
    });

    it('should fail: burn when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await pauseVault({ pauseManager, owner }, tokenContract);
      await burn(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_SEL),
      );
    });

    it('should fail: burn when burn is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await pauseVaultFn({ pauseManager, owner }, tokenContract, BURN_SEL);
      await burn(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_SEL),
      );
    });

    it('should fail: burn when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await pauseGlobalTest({ pauseManager, owner });
      await burn(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_SEL),
      );
    });

    it('should fail: burn when contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await burn(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_SEL),
      );
    });

    it('should fail: burn when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await setErc20PausablePaused(tokenContract);
      await burn(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        { revertMessage: ERC20_PAUSED_MSG },
      );
    });
  });

  describe('mintGoverned()', () => {
    it('should fail: mintGoverned when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, tokenContract);
      await mint(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_GOVERNED_SEL),
      );
    });

    it('should fail: mintGoverned when mintGoverned is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        MINT_GOVERNED_SEL,
      );

      await mint(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_GOVERNED_SEL),
      );
    });

    it('should fail: mintGoverned when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await mint(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_GOVERNED_SEL),
      );
    });

    it('should fail: mintGoverned when contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await mint(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, MINT_GOVERNED_SEL),
      );
    });

    it('should fail: mintGoverned when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setErc20PausablePaused(tokenContract);
      await mint(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        { revertMessage: ERC20_PAUSED_MSG },
      );
    });
  });

  describe('burnGoverned()', () => {
    it('should fail: burnGoverned when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await pauseVault({ pauseManager, owner }, tokenContract);
      await burn(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_GOVERNED_SEL),
      );
    });

    it('should fail: burnGoverned when burnGoverned is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        BURN_GOVERNED_SEL,
      );
      await burn(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_GOVERNED_SEL),
      );
    });

    it('should fail: burnGoverned when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await pauseGlobalTest({ pauseManager, owner });
      await burn(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_GOVERNED_SEL),
      );
    });

    it('should fail: burnGoverned when contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await burn(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        pausedRevert(tokenContract, BURN_GOVERNED_SEL),
      );
    });

    it('should fail: burnGoverned when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await setErc20PausablePaused(tokenContract);
      await burn(
        { tokenContract, owner, isGoverned: true },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
        { revertMessage: ERC20_PAUSED_MSG },
      );
    });
  });

  describe('transfer()', () => {
    it('should fail: transfer when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint({ tokenContract, owner }, owner, PAUSE_TEST_AMOUNT);
      await pauseVault({ pauseManager, owner }, tokenContract);
      await expect(
        tokenContract
          .connect(owner)
          .transfer(regularAccounts[0].address, PAUSE_TEST_AMOUNT),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_SEL);
    });

    it('should fail: transfer when transfer is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint({ tokenContract, owner }, owner, PAUSE_TEST_AMOUNT);
      await pauseVaultFn({ pauseManager, owner }, tokenContract, TRANSFER_SEL);
      await expect(
        tokenContract
          .connect(owner)
          .transfer(regularAccounts[0].address, PAUSE_TEST_AMOUNT),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_SEL);
    });

    it('should fail: transfer when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint({ tokenContract, owner }, owner, PAUSE_TEST_AMOUNT);
      await pauseGlobalTest({ pauseManager, owner });
      await expect(
        tokenContract
          .connect(owner)
          .transfer(regularAccounts[0].address, PAUSE_TEST_AMOUNT),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_SEL);
    });

    it('should fail: transfer when contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint({ tokenContract, owner }, owner, PAUSE_TEST_AMOUNT);
      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await expect(
        tokenContract
          .connect(owner)
          .transfer(regularAccounts[0].address, PAUSE_TEST_AMOUNT),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_SEL);
    });

    it('should fail: transfer when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mint({ tokenContract, owner }, owner, PAUSE_TEST_AMOUNT);
      await setErc20PausablePaused(tokenContract);
      await expect(
        tokenContract
          .connect(owner)
          .transfer(regularAccounts[0].address, PAUSE_TEST_AMOUNT),
      ).revertedWith(ERC20_PAUSED_MSG);
    });
  });

  describe('transferFrom()', () => {
    it('should fail: transferFrom when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await tokenContract
        .connect(regularAccounts[0])
        .approve(regularAccounts[1].address, PAUSE_TEST_AMOUNT);
      await pauseVault({ pauseManager, owner }, tokenContract);
      await expect(
        tokenContract
          .connect(regularAccounts[1])
          .transferFrom(
            regularAccounts[0].address,
            owner.address,
            PAUSE_TEST_AMOUNT,
          ),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_FROM_SEL);
    });

    it('should fail: transferFrom when transferFrom is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await tokenContract
        .connect(regularAccounts[0])
        .approve(regularAccounts[1].address, PAUSE_TEST_AMOUNT);
      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        TRANSFER_FROM_SEL,
      );
      await expect(
        tokenContract
          .connect(regularAccounts[1])
          .transferFrom(
            regularAccounts[0].address,
            owner.address,
            PAUSE_TEST_AMOUNT,
          ),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_FROM_SEL);
    });

    it('should fail: transferFrom when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await tokenContract
        .connect(regularAccounts[0])
        .approve(regularAccounts[1].address, PAUSE_TEST_AMOUNT);
      await pauseGlobalTest({ pauseManager, owner });
      await expect(
        tokenContract
          .connect(regularAccounts[1])
          .transferFrom(
            regularAccounts[0].address,
            owner.address,
            PAUSE_TEST_AMOUNT,
          ),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_FROM_SEL);
    });

    it('should fail: transferFrom when contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await tokenContract
        .connect(regularAccounts[0])
        .approve(regularAccounts[1].address, PAUSE_TEST_AMOUNT);
      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await expect(
        tokenContract
          .connect(regularAccounts[1])
          .transferFrom(
            regularAccounts[0].address,
            owner.address,
            PAUSE_TEST_AMOUNT,
          ),
      )
        .revertedWithCustomError(tokenContract, 'Paused')
        .withArgs(tokenContract.address, TRANSFER_FROM_SEL);
    });

    it('should fail: transferFrom when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await mint(
        { tokenContract, owner },
        regularAccounts[0],
        PAUSE_TEST_AMOUNT,
      );
      await tokenContract
        .connect(regularAccounts[0])
        .approve(regularAccounts[1].address, PAUSE_TEST_AMOUNT);
      await setErc20PausablePaused(tokenContract);
      await expect(
        tokenContract
          .connect(regularAccounts[1])
          .transferFrom(
            regularAccounts[0].address,
            owner.address,
            PAUSE_TEST_AMOUNT,
          ),
      ).revertedWith(ERC20_PAUSED_MSG);
    });
  });

  describe('setMetadata()', () => {
    it('should fail: call from address without token manager role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];

      await setMetadataTest({ tokenContract, owner }, 'url', 'some value', {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('call from address with token manager role', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);

      await setMetadataTest(
        { tokenContract, owner },
        'url',
        'some value',
        undefined,
      );
    });

    it('call when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );

      await pauseGlobalTest({ pauseManager, owner });
      await setMetadataTest(
        { tokenContract, owner },
        'url',
        'some value',
        undefined,
      );
    });

    it('call when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, tokenContract);
      await setMetadataTest(
        { tokenContract, owner },
        'url',
        'some value',
        undefined,
      );
    });

    it('call when setMetadata is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );

      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        SET_METADATA_SEL,
      );
      await setMetadataTest(
        { tokenContract, owner },
        'url',
        'some value',
        undefined,
      );
    });
  });

  describe('setClawbackReceiver()', () => {
    it('should fail: call from address without token manager role nor function permission', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];

      await setClawbackReceiverTest(
        { tokenContract, owner },
        regularAccounts[1].address,
        {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
        },
      );
    });

    it('should fail: new clawback receiver cannot be address zero', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);

      await setClawbackReceiverTest(
        { tokenContract, owner },
        ethers.constants.AddressZero,
        { revertCustomError: { customErrorName: 'InvalidAddress' } },
      );
    });

    it('call from address with token manager role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await setClawbackReceiverTest(
        { tokenContract, owner },
        regularAccounts[2].address,
        undefined,
      );
    });

    it('call from address with scoped function permission only', async () => {
      const { owner, tokenContract, regularAccounts, accessControl, roles } =
        await loadFixture(defaultDeploy);

      const user = regularAccounts[0];
      const nextReceiver = regularAccounts[3].address;
      const selector = encodeFnSelector('setClawbackReceiver(address)');

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.tokenRoles.mTBILL.tokenManager,
        targetContract: tokenContract.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        tokenContract.address,
        selector,
        [{ account: user.address, enabled: true }],
      );

      expect(
        await accessControl.hasRole(roles.common.defaultAdmin, user.address),
      ).eq(false);

      await setClawbackReceiverTest({ tokenContract, owner }, nextReceiver, {
        from: user,
      });
    });

    it('call when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseGlobalTest({ pauseManager, owner });
      await setClawbackReceiverTest(
        { tokenContract, owner },
        regularAccounts[1].address,
        undefined,
      );
    });

    it('call when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVault({ pauseManager, owner }, tokenContract);
      await setClawbackReceiverTest(
        { tokenContract, owner },
        regularAccounts[1].address,
        undefined,
      );
    });

    it('call when setClawbackReceiver is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        SET_CLAWBACK_RECEIVER_SEL,
      );
      await setClawbackReceiverTest(
        { tokenContract, owner },
        regularAccounts[1].address,
        undefined,
      );
    });
  });

  describe('clawback()', () => {
    it('should fail: call from address without token manager role nor function permission', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];
      const victim = regularAccounts[1];
      const amount = parseUnits('1');

      await mint({ tokenContract, owner }, victim, amount);

      await clawbackTest({ tokenContract, owner }, amount, victim, {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should not fail when from address is blacklisted', async () => {
      const { owner, tokenContract, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const holder = regularAccounts[0];
      const amount = parseUnits('10');

      await mint({ tokenContract, owner }, holder, amount);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        holder,
      );

      await clawbackTest({ tokenContract, owner }, amount, holder, undefined);

      expect(await tokenContract.balanceOf(holder.address)).eq(0);
    });

    it('should fail: when clawbackReceiver is blacklisted', async () => {
      const { owner, tokenContract, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const holder = regularAccounts[0];
      const amount = parseUnits('5');

      await mint({ tokenContract, owner }, holder, amount);

      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        regularAccounts[2],
      );
      await setClawbackReceiverTest(
        { tokenContract, owner },
        regularAccounts[2].address,
        undefined,
      );

      await clawbackTest({ tokenContract, owner }, amount, holder, {
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });
    });

    it('call from address with token manager role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const holder = regularAccounts[0];
      const amount = parseUnits('7');

      await mint({ tokenContract, owner }, holder, amount);
      await clawbackTest({ tokenContract, owner }, amount, holder, undefined);
    });

    it('call from address with scoped function permission only', async () => {
      const { owner, tokenContract, regularAccounts, accessControl, roles } =
        await loadFixture(defaultDeploy);

      const operator = regularAccounts[0];
      const holder = regularAccounts[1];
      const amount = parseUnits('3');
      const selector = encodeFnSelector('clawback(uint256,address)');

      await mint({ tokenContract, owner }, holder, amount);

      await setupGrantOperatorRole({
        accessControl,
        owner,
        masterRole: roles.tokenRoles.mTBILL.tokenManager,
        targetContract: tokenContract.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setPermissionRoleTester(
        { accessControl, owner },
        undefined,
        tokenContract.address,
        selector,
        [{ account: operator.address, enabled: true }],
      );

      expect(
        await accessControl.hasRole(
          roles.tokenRoles.mTBILL.tokenManager,
          operator.address,
        ),
      ).eq(false);

      await clawbackTest({ tokenContract, owner }, amount, holder, {
        from: operator,
      });
    });

    it('should fail: clawback when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      const holder = regularAccounts[0];
      await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
      await pauseVault({ pauseManager, owner }, tokenContract);
      await clawbackTest(
        { tokenContract, owner },
        PAUSE_TEST_AMOUNT,
        holder,
        pausedRevert(tokenContract, CLAWBACK_SEL),
      );
    });

    it('should fail: clawback when clawback is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      const holder = regularAccounts[0];
      await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
      await pauseVaultFn({ pauseManager, owner }, tokenContract, CLAWBACK_SEL);
      await clawbackTest(
        { tokenContract, owner },
        PAUSE_TEST_AMOUNT,
        holder,
        pausedRevert(tokenContract, CLAWBACK_SEL),
      );
    });

    it('should fail: clawback when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      const holder = regularAccounts[0];
      await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
      await pauseGlobalTest({ pauseManager, owner });
      await clawbackTest(
        { tokenContract, owner },
        PAUSE_TEST_AMOUNT,
        holder,
        pausedRevert(tokenContract, CLAWBACK_SEL),
      );
    });

    it('should fail: clawback when contract admin paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract, regularAccounts } =
        await loadFixture(defaultDeploy);

      const holder = regularAccounts[0];
      await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
      await adminPauseContractTest({ pauseManager, owner }, tokenContract);
      await clawbackTest(
        { tokenContract, owner },
        PAUSE_TEST_AMOUNT,
        holder,
        pausedRevert(tokenContract, CLAWBACK_SEL),
      );
    });

    it('should fail: clawback when ERC20Pausable is paused', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const holder = regularAccounts[0];
      await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
      await setErc20PausablePaused(tokenContract);
      await clawbackTest({ tokenContract, owner }, PAUSE_TEST_AMOUNT, holder, {
        revertMessage: ERC20_PAUSED_MSG,
      });
    });
  });

  describe('increaseMintRateLimit()', () => {
    it('should fail: call from address without token manager role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];

      await increaseMintRateLimitTest({ tokenContract, owner }, days(1), 1, {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: call with new limit <= existing limit', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100, {
        revertCustomError: {
          customErrorName: 'InvalidNewLimit',
          args: [100, 100],
        },
      });
    });

    it('call from address with token manager role', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
    });

    it('should fail: when window is shorter than 1 minute', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);

      await increaseMintRateLimitTest(
        { tokenContract, owner },
        59,
        parseUnits('1000'),
        {
          revertCustomError: {
            customErrorName: 'WindowTooShort',
            args: [59],
          },
        },
      );
    });

    it('call when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );

      await pauseGlobalTest({ pauseManager, owner });
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        days(1),
        parseUnits('1000'),
      );
    });

    it('call when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );

      await pauseVault({ pauseManager, owner }, tokenContract);
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        days(1),
        parseUnits('1000'),
      );
    });

    it('call when increaseMintRateLimit is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );

      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        INCREASE_MINT_RATE_LIMIT_SEL,
      );
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        days(1),
        parseUnits('1000'),
      );
    });
  });

  describe('decreaseMintRateLimit()', () => {
    it('should fail: call from address without token manager role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];

      await decreaseMintRateLimitTest({ tokenContract, owner }, days(1), 1, {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: call with new limit >= existing limit', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100, {
        revertCustomError: {
          customErrorName: 'InvalidNewLimit',
          args: [100, 100],
        },
      });
    });

    it('call from address with token manager role', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
      await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
    });

    it('call when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
      await pauseGlobalTest({ pauseManager, owner });
      await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
    });

    it('call when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
      await pauseVault({ pauseManager, owner }, tokenContract);
      await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
    });

    it('call when decreaseMintRateLimit is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        DECREASE_MINT_RATE_LIMIT_SEL,
      );
      await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
    });
  });

  describe('removeMintRateLimitConfig()', () => {
    it('should fail: call from address without token manager role', async () => {
      const { owner, tokenContract, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const caller = regularAccounts[0];
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await removeMintRateLimitTest({ tokenContract, owner }, window, {
        from: caller,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: when window does not exist', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);

      await removeMintRateLimitTest({ tokenContract, owner }, days(99), {
        revertCustomError: {
          customErrorName: 'UnknownWindowLimit',
        },
      });
    });

    it('call from address with token manager role', async () => {
      const { owner, tokenContract } = await loadFixture(defaultDeploy);
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await removeMintRateLimitTest({ tokenContract, owner }, window);
    });

    it('call when globally paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await pauseGlobalTest({ pauseManager, owner });
      await removeMintRateLimitTest({ tokenContract, owner }, window);
    });

    it('call when contract is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await pauseVault({ pauseManager, owner }, tokenContract);
      await removeMintRateLimitTest({ tokenContract, owner }, window);
    });

    it('call when removeMintRateLimitConfig is paused by pause manager', async () => {
      const { pauseManager, owner, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const window = days(1);

      await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      await pauseVaultFn(
        { pauseManager, owner },
        tokenContract,
        REMOVE_MINT_RATE_LIMIT_SEL,
      );
      await removeMintRateLimitTest({ tokenContract, owner }, window);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: mint(...) when address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];

      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );
      await mint({ tokenContract, owner }, blacklisted, 1, {
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });
    });

    it('should fail: transfer(...) when from address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ tokenContract, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );

      await expect(
        tokenContract.connect(blacklisted).transfer(to.address, 1),
      ).revertedWithCustomError(
        tokenContract,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transfer(...) when to address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];

      await mint({ tokenContract, owner }, from, 1);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );

      await expect(
        tokenContract.connect(from).transfer(blacklisted.address, 1),
      ).revertedWithCustomError(
        tokenContract,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transferFrom(...) when from address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ tokenContract, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );

      await tokenContract.connect(blacklisted).approve(to.address, 1);

      await expect(
        tokenContract
          .connect(to)
          .transferFrom(blacklisted.address, to.address, 1),
      ).revertedWithCustomError(
        tokenContract,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transferFrom(...) when to address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const caller = regularAccounts[2];

      await mint({ tokenContract, owner }, from, 1);

      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );
      await tokenContract.connect(from).approve(caller.address, 1);

      await expect(
        tokenContract
          .connect(caller)
          .transferFrom(from.address, blacklisted.address, 1),
      ).revertedWithCustomError(
        tokenContract,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: burn(...) when address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];

      await mint({ tokenContract, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );
      await burn({ tokenContract, owner }, blacklisted, 1, {
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });
    });

    it('transferFrom(...) when caller address is blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const to = regularAccounts[2];

      await mint({ tokenContract, owner }, from, 1);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );

      await tokenContract.connect(from).approve(blacklisted.address, 1);

      await expect(
        tokenContract
          .connect(blacklisted)
          .transferFrom(from.address, to.address, 1),
      ).not.reverted;
    });

    it('transfer(...) when caller address was blacklisted and then un-blacklisted', async () => {
      const { owner, regularAccounts, accessControl, tokenContract } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[2];

      await mint({ tokenContract, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );

      await expect(
        tokenContract.connect(blacklisted).transfer(to.address, 1),
      ).revertedWithCustomError(
        tokenContract,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );

      await unBlackList(
        { blacklistable: tokenContract, accessControl, owner },
        blacklisted,
      );

      await expect(tokenContract.connect(blacklisted).transfer(to.address, 1))
        .not.reverted;
    });

    it('transfer(...) is not affected by mint rate limits set to 0', async () => {
      const { owner, regularAccounts, tokenContract } = await loadFixture(
        defaultDeploy,
      );
      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const dayWindow = days(1);
      const minuteWindow = 60;

      await mint({ tokenContract, owner }, from, 1);

      await increaseMintRateLimitTest({ tokenContract, owner }, dayWindow, 1);
      await decreaseMintRateLimitTest({ tokenContract, owner }, dayWindow, 0);
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        minuteWindow,
        1,
      );
      await decreaseMintRateLimitTest(
        { tokenContract, owner },
        minuteWindow,
        0,
      );

      await increaseMintRateLimitTest({ tokenContract, owner }, dayWindow, 1);
      await decreaseMintRateLimitTest({ tokenContract, owner }, dayWindow, 0);
      await increaseMintRateLimitTest(
        { tokenContract, owner },
        minuteWindow,
        1,
      );
      await decreaseMintRateLimitTest(
        { tokenContract, owner },
        minuteWindow,
        0,
      );

      await expect(tokenContract.connect(from).transfer(to.address, 1)).not
        .reverted;
      expect(await tokenContract.balanceOf(to.address)).eq(1);
    });
  });
});

describe('mTokenPermissioned', () => {
  describe('transfer()', () => {
    it('should fail: transfer when sender is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
      await accessControl.revokeRole(
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );

      await expect(
        mTokenPermissioned.connect(from).transfer(to.address, 1),
      ).revertedWithCustomError(mTokenPermissioned, 'NotGreenlisted');
    });

    it('should fail: transfer when recipient is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);

      await expect(
        mTokenPermissioned.connect(from).transfer(to.address, 1),
      ).revertedWithCustomError(mTokenPermissioned, 'NotGreenlisted');
    });

    it('should fail: transfer when from is blacklisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
      await blackList(
        {
          blacklistable: mTokenPermissioned,
          accessControl,
          owner,
        },
        from,
      );

      await expect(
        mTokenPermissioned.connect(from).transfer(to.address, 1),
      ).revertedWithCustomError(
        mTokenPermissioned,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transfer when ERC20Pausable is paused', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);

      await setErc20PausablePaused(mTokenPermissioned);

      await expect(
        mTokenPermissioned.connect(from).transfer(to.address, 1),
      ).revertedWith(ERC20_PAUSED_MSG);
    });

    it('should fail: mint when ERC20Pausable is paused', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const to = regularAccounts[0];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );
      await setErc20PausablePaused(mTokenPermissioned);

      await mint({ tokenContract: mTokenPermissioned, owner }, to, 1, {
        revertMessage: ERC20_PAUSED_MSG,
      });
    });

    it('should fail: burn when ERC20Pausable is paused', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const holder = regularAccounts[0];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, holder, 1);
      await setErc20PausablePaused(mTokenPermissioned);

      await burn({ tokenContract: mTokenPermissioned, owner }, holder, 1, {
        revertMessage: ERC20_PAUSED_MSG,
      });
    });

    it('should fail: mint when receiver is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenPermissioned } = await loadFixture(
        mTokenPermissionedFixture.bind(this, baseFixture),
      );

      await mint(
        { tokenContract: mTokenPermissioned, owner },
        regularAccounts[0],
        1,
        { revertCustomError: { customErrorName: 'NotGreenlisted' } },
      );
    });

    it('transfer when both parties are greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);

      await expect(mTokenPermissioned.connect(from).transfer(to.address, 1)).not
        .reverted;
      expect(await mTokenPermissioned.balanceOf(to.address)).eq(1);
    });

    it('mint when receiver is greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const to = regularAccounts[0];
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );

      await mint(
        { tokenContract: mTokenPermissioned, owner },
        to,
        parseUnits('1'),
      );
    });

    it('burn without greenlist on holder', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const holder = regularAccounts[0];
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, holder, 1);
      await accessControl.revokeRole(
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );

      await burn({ tokenContract: mTokenPermissioned, owner }, holder, 1);
    });
  });

  describe('transferFrom()', () => {
    const greenlistComboCases: {
      fromGreenlisted: boolean;
      toGreenlisted: boolean;
      callerGreenlisted: boolean;
      expectSuccess: boolean;
    }[] = [
      {
        fromGreenlisted: true,
        toGreenlisted: true,
        callerGreenlisted: true,
        expectSuccess: true,
      },
      {
        fromGreenlisted: true,
        toGreenlisted: true,
        callerGreenlisted: false,
        expectSuccess: true,
      },
      {
        fromGreenlisted: false,
        toGreenlisted: true,
        callerGreenlisted: true,
        expectSuccess: false,
      },
      {
        fromGreenlisted: false,
        toGreenlisted: true,
        callerGreenlisted: false,
        expectSuccess: false,
      },
      {
        fromGreenlisted: false,
        toGreenlisted: false,
        callerGreenlisted: true,
        expectSuccess: false,
      },
      {
        fromGreenlisted: false,
        toGreenlisted: false,
        callerGreenlisted: false,
        expectSuccess: false,
      },
      {
        fromGreenlisted: true,
        toGreenlisted: false,
        callerGreenlisted: true,
        expectSuccess: false,
      },
      {
        fromGreenlisted: true,
        toGreenlisted: false,
        callerGreenlisted: false,
        expectSuccess: false,
      },
    ];

    greenlistComboCases.forEach(
      ({
        fromGreenlisted,
        toGreenlisted,
        callerGreenlisted,
        expectSuccess,
      }) => {
        const fromL = fromGreenlisted ? 'greenlisted' : 'not greenlisted';
        const toL = toGreenlisted ? 'greenlisted' : 'not greenlisted';
        const callerL = callerGreenlisted ? 'greenlisted' : 'not greenlisted';

        it(
          expectSuccess
            ? `succeeds: from ${fromL}, to ${toL}, caller ${callerL}`
            : `should fail: from ${fromL}, to ${toL}, caller ${callerL}`,
          async () => {
            const baseFixture = await loadFixture(defaultDeploy);
            const {
              owner,
              accessControl,
              regularAccounts,
              mTokenPermissioned,
              mTokenPermissionedRoles,
            } = await loadFixture(
              mTokenPermissionedFixture.bind(this, baseFixture),
            );

            const from = regularAccounts[0];
            const caller = regularAccounts[1];
            const to = regularAccounts[2];
            const { greenlisted } = mTokenPermissionedRoles;

            await accessControl['grantRole(bytes32,address)'](
              greenlisted,
              from.address,
            );
            await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
            await mTokenPermissioned.connect(from).approve(caller.address, 1);

            if (!fromGreenlisted) {
              await accessControl.revokeRole(greenlisted, from.address);
            }
            if (toGreenlisted) {
              await accessControl['grantRole(bytes32,address)'](
                greenlisted,
                to.address,
              );
            }
            if (callerGreenlisted) {
              await accessControl['grantRole(bytes32,address)'](
                greenlisted,
                caller.address,
              );
            }

            const tx = mTokenPermissioned
              .connect(caller)
              .transferFrom(from.address, to.address, 1);

            if (expectSuccess) {
              await expect(tx).not.reverted;
              expect(await mTokenPermissioned.balanceOf(to.address)).eq(1);
            } else {
              await expect(tx).revertedWithCustomError(
                mTokenPermissioned,
                'NotGreenlisted',
              );
            }
          },
        );
      },
    );

    it('should fail: transferFrom when from is blacklisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const spender = regularAccounts[1];
      const to = regularAccounts[2];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
      await blackList(
        {
          blacklistable: mTokenPermissioned,
          accessControl,
          owner,
        },
        from,
      );
      await mTokenPermissioned.connect(from).approve(spender.address, 1);

      await expect(
        mTokenPermissioned
          .connect(spender)
          .transferFrom(from.address, to.address, 1),
      ).revertedWithCustomError(
        mTokenPermissioned,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transferFrom when to is blacklisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const spender = regularAccounts[1];
      const to = regularAccounts[2];

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        to.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
      await blackList(
        {
          blacklistable: mTokenPermissioned,
          accessControl,
          owner,
        },
        to,
      );
      await mTokenPermissioned.connect(from).approve(spender.address, 1);

      await expect(
        mTokenPermissioned
          .connect(spender)
          .transferFrom(from.address, to.address, 1),
      ).revertedWithCustomError(
        mTokenPermissioned,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });
  });

  describe('clawback()', () => {
    it('should not fail when from address is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        clawbackReceiver,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const holder = regularAccounts[0];
      const amount = parseUnits('1');

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        clawbackReceiver.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, holder, amount);
      await accessControl.revokeRole(
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );

      await clawbackTest(
        { tokenContract: mTokenPermissioned, owner },
        amount,
        holder,
      );
    });

    it('should fail: when clawbackReceiver is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        clawbackReceiver,
        mTokenPermissioned,
        mTokenPermissionedRoles,
      } = await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

      const holder = regularAccounts[0];
      const amount = parseUnits('1');

      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );
      await mint({ tokenContract: mTokenPermissioned, owner }, holder, amount);
      await accessControl.revokeRole(
        mTokenPermissionedRoles.greenlisted,
        holder.address,
      );
      await accessControl.revokeRole(
        mTokenPermissionedRoles.greenlisted,
        clawbackReceiver.address,
      );

      await clawbackTest(
        { tokenContract: mTokenPermissioned, owner },
        amount,
        holder,
        { revertCustomError: { customErrorName: 'NotGreenlisted' } },
      );
    });
  });
});

describe('mTokenMinBalance', () => {
  describe('transfer()', () => {
    it('transfer when both parties hold above min balance after transfer', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const amount = parseUnits('0.1');

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('3'),
      );

      await expect(mTokenMinBalance.connect(from).transfer(to.address, amount))
        .not.reverted;
      expect(await mTokenMinBalance.balanceOf(from.address)).eq(
        parseUnits('2.9'),
      );
      expect(await mTokenMinBalance.balanceOf(to.address)).eq(
        parseUnits('3.1'),
      );
    });

    it('should fail: transfer dust to empty recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('0.1')),
      ).revertedWith('MTMB: min balance not met');
    });

    it('transfer dust to empty recipient when recipient is free from min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenMinBalance,
        mTokenMinBalanceRoles,
      } = await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const amount = parseUnits('0.1');

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenMinBalanceRoles.minBalanceExempt,
        to.address,
      );

      await expect(mTokenMinBalance.connect(from).transfer(to.address, amount))
        .not.reverted;
      expect(await mTokenMinBalance.balanceOf(to.address)).eq(amount);
    });

    it('should fail: transfer dust from waived sender to empty non-waived recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenMinBalance,
        mTokenMinBalanceRoles,
      } = await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await accessControl['grantRole(bytes32,address)'](
        mTokenMinBalanceRoles.minBalanceExempt,
        from.address,
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('0.3'),
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('0.1')),
      ).revertedWith('MTMB: min balance not met');
    });

    it('transfer entire balance leaving sender at zero', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const amount = parseUnits('3');

      await mint({ tokenContract: mTokenMinBalance, owner }, from, amount);

      await expect(mTokenMinBalance.connect(from).transfer(to.address, amount))
        .not.reverted;
      expect(await mTokenMinBalance.balanceOf(from.address)).eq(0);
      expect(await mTokenMinBalance.balanceOf(to.address)).eq(amount);
    });

    it('should fail: transfer leaving sender below min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('1'),
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('2.5')),
      ).revertedWith('MTMB: min balance not met');
    });

    it('transfer leaving sender below min balance when sender is free from min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenMinBalance,
        mTokenMinBalanceRoles,
      } = await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('1'),
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenMinBalanceRoles.minBalanceExempt,
        from.address,
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('2.5')),
      ).not.reverted;
      expect(await mTokenMinBalance.balanceOf(from.address)).eq(
        parseUnits('0.5'),
      );
    });

    it('transfer leaving both parties at exactly min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('2'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('1'),
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('1')),
      ).not.reverted;
      expect(await mTokenMinBalance.balanceOf(from.address)).eq(
        parseUnits('1'),
      );
      expect(await mTokenMinBalance.balanceOf(to.address)).eq(parseUnits('2'));
    });

    it('should fail: transfer when from is blacklisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, accessControl, regularAccounts, mTokenMinBalance } =
        await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('3'),
      );
      await blackList(
        { blacklistable: mTokenMinBalance, accessControl, owner },
        from,
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('0.1')),
      ).revertedWithCustomError(
        mTokenMinBalance,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transfer when to is blacklisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, accessControl, regularAccounts, mTokenMinBalance } =
        await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('3'),
      );
      await blackList(
        { blacklistable: mTokenMinBalance, accessControl, owner },
        to,
      );

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('0.1')),
      ).revertedWithCustomError(
        mTokenMinBalance,
        acErrors.WMAC_BLACKLISTED().customErrorName,
      );
    });

    it('should fail: transfer when ERC20Pausable is paused', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('3'),
      );
      await setErc20PausablePaused(mTokenMinBalance);

      await expect(
        mTokenMinBalance.connect(from).transfer(to.address, parseUnits('0.1')),
      ).revertedWith(ERC20_PAUSED_MSG);
    });
  });

  describe('transferFrom()', () => {
    it('transferFrom when both parties hold above min balance after transfer', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const spender = regularAccounts[1];
      const to = regularAccounts[2];
      const amount = parseUnits('0.1');

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('3'),
      );
      await mTokenMinBalance.connect(from).approve(spender.address, amount);

      await expect(
        mTokenMinBalance
          .connect(spender)
          .transferFrom(from.address, to.address, amount),
      ).not.reverted;
    });

    it('should fail: transferFrom dust to empty recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const spender = regularAccounts[1];
      const to = regularAccounts[2];
      const amount = parseUnits('0.1');

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mTokenMinBalance.connect(from).approve(spender.address, amount);

      await expect(
        mTokenMinBalance
          .connect(spender)
          .transferFrom(from.address, to.address, amount),
      ).revertedWith('MTMB: min balance not met');
    });
  });

  describe('mint()', () => {
    it('mint at least 1 token to empty recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        regularAccounts[0],
        parseUnits('1'),
      );
    });

    it('should fail: mint less than 1 token to empty recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        regularAccounts[0],
        parseUnits('0.5'),
        { revertMessage: 'MTMB: min balance not met' },
      );
    });

    it('mint less than 1 token to empty recipient when free from min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenMinBalance,
        mTokenMinBalanceRoles,
      } = await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const to = regularAccounts[0];
      await accessControl['grantRole(bytes32,address)'](
        mTokenMinBalanceRoles.minBalanceExempt,
        to.address,
      );

      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('0.5'),
      );
    });

    it('mint dust to recipient that already holds min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const to = regularAccounts[0];
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('1'),
      );
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        to,
        parseUnits('0.1'),
      );
    });
  });

  describe('burn()', () => {
    it('burn leaving holder at zero', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const holder = regularAccounts[0];
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('1'),
      );
      await burn(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('1'),
      );
    });

    it('burn leaving holder at or above min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const holder = regularAccounts[0];
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('3'),
      );
      await burn(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('1'),
      );
      expect(await mTokenMinBalance.balanceOf(holder.address)).eq(
        parseUnits('2'),
      );
    });

    it('should fail: burn leaving holder below min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const holder = regularAccounts[0];
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('3'),
      );

      await burn(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('2.5'),
        { revertMessage: 'MTMB: min balance not met' },
      );
    });

    it('burn leaving holder below min balance when free from min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenMinBalance,
        mTokenMinBalanceRoles,
      } = await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

      const holder = regularAccounts[0];
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('3'),
      );
      await accessControl['grantRole(bytes32,address)'](
        mTokenMinBalanceRoles.minBalanceExempt,
        holder.address,
      );

      await burn(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('2.5'),
      );
      expect(await mTokenMinBalance.balanceOf(holder.address)).eq(
        parseUnits('0.5'),
      );
    });

    it('should fail: burnGoverned leaving holder below min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
        mTokenMinBalanceFixture.bind(this, baseFixture),
      );

      const holder = regularAccounts[0];
      await mint(
        { tokenContract: mTokenMinBalance, owner },
        holder,
        parseUnits('3'),
      );

      await expect(
        mTokenMinBalance
          .connect(owner)
          .burnGoverned(holder.address, parseUnits('2.5')),
      ).revertedWith('MTMB: min balance not met');
    });
  });
});

describe('mTokenPermissionedMinBalance', () => {
  describe('transfer()', () => {
    it('should fail: transfer when sender is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const { greenlisted } = mTokenPermissionedMinBalanceRoles;

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        to.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        to,
        parseUnits('3'),
      );
      await accessControl.revokeRole(greenlisted, from.address);

      await expect(
        mTokenPermissionedMinBalance
          .connect(from)
          .transfer(to.address, parseUnits('0.1')),
      ).revertedWithCustomError(mTokenPermissionedMinBalance, 'NotGreenlisted');
    });

    it('should fail: transfer when recipient is not greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const { greenlisted } = mTokenPermissionedMinBalanceRoles;

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );

      await expect(
        mTokenPermissionedMinBalance
          .connect(from)
          .transfer(to.address, parseUnits('0.1')),
      ).revertedWithCustomError(mTokenPermissionedMinBalance, 'NotGreenlisted');
    });

    it('should fail: transfer dust to empty recipient when both greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const { greenlisted } = mTokenPermissionedMinBalanceRoles;

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        to.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );

      await expect(
        mTokenPermissionedMinBalance
          .connect(from)
          .transfer(to.address, parseUnits('0.1')),
      ).revertedWith('MTMB: min balance not met');
    });

    it('transfer dust to empty recipient when recipient is free from min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const { greenlisted, minBalanceExempt } =
        mTokenPermissionedMinBalanceRoles;
      const amount = parseUnits('0.1');

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        to.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await accessControl['grantRole(bytes32,address)'](
        minBalanceExempt,
        to.address,
      );

      await expect(
        mTokenPermissionedMinBalance.connect(from).transfer(to.address, amount),
      ).not.reverted;
      expect(await mTokenPermissionedMinBalance.balanceOf(to.address)).eq(
        amount,
      );
    });

    it('transfer when both greenlisted and above min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const to = regularAccounts[1];
      const { greenlisted } = mTokenPermissionedMinBalanceRoles;
      const amount = parseUnits('0.1');

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        to.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        to,
        parseUnits('3'),
      );

      await expect(
        mTokenPermissionedMinBalance.connect(from).transfer(to.address, amount),
      ).not.reverted;
    });
  });

  describe('transferFrom()', () => {
    it('should fail: transferFrom dust to empty recipient when both greenlisted', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const spender = regularAccounts[1];
      const to = regularAccounts[2];
      const { greenlisted } = mTokenPermissionedMinBalanceRoles;
      const amount = parseUnits('0.1');

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        to.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mTokenPermissionedMinBalance
        .connect(from)
        .approve(spender.address, amount);

      await expect(
        mTokenPermissionedMinBalance
          .connect(spender)
          .transferFrom(from.address, to.address, amount),
      ).revertedWith('MTMB: min balance not met');
    });

    it('transferFrom when both greenlisted and above min balance', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const from = regularAccounts[0];
      const spender = regularAccounts[1];
      const to = regularAccounts[2];
      const { greenlisted } = mTokenPermissionedMinBalanceRoles;
      const amount = parseUnits('0.1');

      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        from.address,
      );
      await accessControl['grantRole(bytes32,address)'](
        greenlisted,
        to.address,
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        from,
        parseUnits('3'),
      );
      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        to,
        parseUnits('3'),
      );
      await mTokenPermissionedMinBalance
        .connect(from)
        .approve(spender.address, amount);

      await expect(
        mTokenPermissionedMinBalance
          .connect(spender)
          .transferFrom(from.address, to.address, amount),
      ).not.reverted;
    });
  });

  describe('mint()', () => {
    it('should fail: mint less than 1 token to greenlisted empty recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const to = regularAccounts[0];
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedMinBalanceRoles.greenlisted,
        to.address,
      );

      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        to,
        parseUnits('0.5'),
        { revertMessage: 'MTMB: min balance not met' },
      );
    });

    it('mint at least 1 token to greenlisted recipient', async () => {
      const baseFixture = await loadFixture(defaultDeploy);
      const {
        owner,
        accessControl,
        regularAccounts,
        mTokenPermissionedMinBalance,
        mTokenPermissionedMinBalanceRoles,
      } = await loadFixture(
        mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
      );

      const to = regularAccounts[0];
      await accessControl['grantRole(bytes32,address)'](
        mTokenPermissionedMinBalanceRoles.greenlisted,
        to.address,
      );

      await mint(
        { tokenContract: mTokenPermissionedMinBalance, owner },
        to,
        parseUnits('1'),
      );
    });
  });
});
