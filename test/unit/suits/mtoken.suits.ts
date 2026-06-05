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

import { MTokenName } from '../../../config';
import { getTokenContractNames } from '../../../helpers/contracts';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import {
  getAllRoles,
  getRolesForToken,
  getRolesNamesCommon,
  getRolesNamesForToken,
} from '../../../helpers/roles';
import { encodeFnSelector } from '../../../helpers/utils';
import {
  acErrors,
  blackList,
  setupFunctionAccessGrantOperator,
  setFunctionPermissionTester,
  unBlackList,
} from '../../../test/common/ac.helpers';
import { defaultDeploy } from '../../../test/common/fixtures';
import {
  burn,
  clawbackTest,
  decreaseMintRateLimitTest,
  increaseMintRateLimitTest,
  mint,
  setClawbackReceiverTest,
  setMetadataTest,
} from '../../../test/common/mTBILL.helpers';
import {
  CustomAggregatorV3CompatibleFeed,
  CustomAggregatorV3CompatibleFeedGrowth,
  DataFeed,
  DepositVault,
  DepositVaultWithUSTB,
  MToken,
  RedemptionVault,
  RedemptionVaultWithSwapper,
} from '../../../typechain-types';
import {
  adminPauseContractTest,
  pauseGlobalTest,
  pauseVault,
  pauseVaultFn,
  validateImplementation,
} from '../../common/common.helpers';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationsTester,
} from '../../common/timelock-manager.helpers';

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
const ERC20_PAUSABLE_PAUSED_STORAGE_SLOT = 101;
export const ERC20_PAUSED_MSG = 'ERC20Pausable: token transfer while paused';
const PAUSE_TEST_AMOUNT = parseUnits('100');

const toStorageSlotHex = (slot: number) =>
  '0x' + slot.toString(16).padStart(64, '0');

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

export const mTokenContractsSuits = (token: MTokenName) => {
  const contractNames = getTokenContractNames(token);
  const allRoles = getAllRoles();
  const allRoleNames = getRolesNamesCommon();

  const tokenRoles = getRolesForToken(token);
  const tokenRoleNames = getRolesNamesForToken(token);

  const isTac = token.startsWith('TAC');
  const contractNamesForTac = getTokenContractNames(
    token.replace('TAC', '') as MTokenName,
  );

  const getContractFactory = async (contract: string) => {
    return await ethers.getContractFactory(contract);
  };

  const deployProxyContract = async <TContract extends Contract = Contract>(
    contractKey: keyof Omit<typeof contractNames, 'layerZero'>,
    initializer = 'initialize',
    ...initParams: unknown[]
  ) => {
    const shouldReplaceTacContracts =
      isTac &&
      (contractKey === 'customAggregator' || contractKey === 'dataFeed');

    const factory = await getContractFactory(
      shouldReplaceTacContracts
        ? contractNamesForTac[contractKey]!
        : contractNames[contractKey]!,
    );

    await validateImplementation(factory);
    const impl = await factory.deploy();

    const proxy = await (
      await getContractFactory('ERC1967Proxy')
    ).deploy(
      impl.address,
      factory.interface.encodeFunctionData(initializer, initParams),
    );

    return factory.attach(proxy.address) as TContract;
  };

  const deployProxyContractIfExists = async <
    TContract extends Contract = Contract,
  >(
    contractKey: keyof Omit<typeof contractNames, 'layerZero'>,
    initializer = 'initialize',
    ...initParams: unknown[]
  ) => {
    const shouldReplaceTacContracts =
      isTac &&
      (contractKey === 'customAggregator' || contractKey === 'dataFeed');

    const factory = await getContractFactory(
      shouldReplaceTacContracts
        ? contractNamesForTac[contractKey]!
        : contractNames[contractKey]!,
    ).catch((_) => {
      return null;
    });

    if (!factory) {
      return null;
    }

    const impl = await factory.deploy();

    const proxy = await (
      await getContractFactory('ERC1967Proxy')
    ).deploy(
      impl.address,
      factory.interface.encodeFunctionData(initializer, initParams),
    );

    return factory.attach(proxy.address) as TContract;
  };

  const deployMTokenWithFixture = async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tokenContract = await deployProxyContract<MToken>(
      'token',
      undefined,
      fixture.accessControl.address,
      fixture.clawbackReceiver.address,
    );

    if (mTokensMetadata[token]?.isPermissioned) {
      const greenlistedRole = tokenRoles.greenlisted;
      for (const account of fixture.regularAccounts) {
        await fixture.accessControl
          .connect(fixture.owner)
          .grantRole(greenlistedRole, account.address);
      }
    }

    return { tokenContract, ...fixture };
  };

  const pausedRevert = (tokenContract: MToken, selector: string) => ({
    revertCustomError: {
      customErrorName: 'Paused',
      args: [tokenContract.address, selector],
    },
  });

  const adminUnpauseContractViaTimelock = async (
    fixture: Awaited<ReturnType<typeof deployMTokenWithFixture>>,
  ) => {
    const { pauseManager, timelockManager, timelock, owner, accessControl } =
      fixture;
    const calldata = pauseManager.interface.encodeFunctionData(
      'contractAdminUnpause',
      [fixture.tokenContract.address],
    );

    await scheduleTimelockOperationsTester(
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

  const deployMTokenVaultsWithFixture = async () => {
    const { tokenContract, ...fixture } = await deployMTokenWithFixture();
    const customAggregatorFeed =
      await deployProxyContractIfExists<CustomAggregatorV3CompatibleFeed>(
        'customAggregator',
        undefined,
        fixture.accessControl.address,
        2,
        parseUnits('10000', 8),
        parseUnits('1', 8),
        'Custom Data Feed',
      );

    const customAggregatorFeedGrowth =
      await deployProxyContractIfExists<CustomAggregatorV3CompatibleFeedGrowth>(
        'customAggregatorGrowth',
        undefined,
        fixture.accessControl.address,
        2,
        parseUnits('10000', 8),
        parseUnits('1', 8),
        parseUnits('0', 8),
        parseUnits('100', 8),
        false,
        'Custom Data Feed',
      );

    await customAggregatorFeed?.setRoundData?.(parseUnits('1.01', 8));
    await customAggregatorFeedGrowth?.setRoundData?.(
      parseUnits('1.01', 8),
      await ethers.provider.getBlock('latest').then((block) => block.timestamp),
      0,
    );

    const dataFeed = await deployProxyContract<DataFeed>(
      'dataFeed',
      undefined,
      fixture.accessControl.address,
      customAggregatorFeed?.address ?? customAggregatorFeedGrowth?.address,
      3 * 24 * 3600,
      parseUnits('0.1', 8),
      parseUnits('10000', 8),
    );

    const depositVault = await deployProxyContractIfExists<DepositVault>(
      'dv',
      undefined,
      {
        ac: fixture.accessControl.address,
        sanctionsList: fixture.mockedSanctionsList.address,
        variationTolerance: 1,
        minAmount: parseUnits('100'),
        mToken: tokenContract.address,
        mTokenDataFeed: dataFeed.address,
        tokensReceiver: fixture.tokensReceiver.address,
        instantFee: 100,
        minInstantFee: 0,
        maxInstantFee: 10000,
        limitConfigs: [
          {
            limit: parseUnits('100000'),
            window: days(1),
          },
        ],
        maxInstantShare: 100_00,
      },
      {
        minMTokenAmountForFirstDeposit: 0,
        maxSupplyCap: 0,
      },
    );

    const depositVaultUstb =
      await deployProxyContractIfExists<DepositVaultWithUSTB>(
        'dvUstb',
        'initialize((address,address,uint256,uint256,address,address,address,address,uint256,uint64,uint64,uint64,(uint256,uint256)[]),(uint256,uint256),address)',
        {
          ac: fixture.accessControl.address,
          sanctionsList: fixture.mockedSanctionsList.address,
          variationTolerance: 1,
          minAmount: parseUnits('100'),
          mToken: tokenContract.address,
          mTokenDataFeed: dataFeed.address,
          tokensReceiver: fixture.tokensReceiver.address,
          instantFee: 100,
          minInstantFee: 0,
          maxInstantFee: 10000,
          limitConfigs: [
            {
              limit: parseUnits('100000'),
              window: days(1),
            },
          ],
          maxInstantShare: 100_00,
        },
        {
          minMTokenAmountForFirstDeposit: 0,
          maxSupplyCap: 0,
        },
        fixture.ustbToken.address,
      );

    const redemptionVault = await deployProxyContractIfExists<RedemptionVault>(
      'rv',
      undefined,
      {
        ac: fixture.accessControl.address,
        sanctionsList: fixture.mockedSanctionsList.address,
        variationTolerance: 1,
        minAmount: parseUnits('100'),
        mToken: tokenContract.address,
        mTokenDataFeed: dataFeed.address,
        tokensReceiver: fixture.tokensReceiver.address,
        instantFee: 100,
        limitConfigs: [
          {
            limit: parseUnits('100000'),
            window: days(1),
          },
        ],
        minInstantFee: 0,
        maxInstantFee: 10000,
        maxInstantShare: 100_00,
      },
      {
        requestRedeemer: fixture.requestRedeemer.address,
        loanLp: fixture.loanLp.address,
        loanRepaymentAddress: fixture.loanRepaymentAddress.address,
        loanSwapperVault: fixture.redemptionVaultLoanSwapper.address,
        maxLoanApr: 0,
        loanApr: 0,
      },
    );
    const redemptionVaultWithSwapper =
      await deployProxyContractIfExists<RedemptionVaultWithSwapper>(
        'rvSwapper',
        undefined,
        {
          ac: fixture.accessControl.address,
          sanctionsList: fixture.mockedSanctionsList.address,
          variationTolerance: 1,
          minAmount: parseUnits('100'),
          mToken: tokenContract.address,
          mTokenDataFeed: dataFeed.address,
          tokensReceiver: fixture.tokensReceiver.address,
          instantFee: 100,
          limitConfigs: [
            {
              limit: parseUnits('100000'),
              window: days(1),
            },
          ],
          minInstantFee: 0,
          maxInstantFee: 10000,
          maxInstantShare: 100_00,
        },
        {
          requestRedeemer: fixture.requestRedeemer.address,
          loanLp: fixture.loanLp.address,
          loanRepaymentAddress: fixture.loanRepaymentAddress.address,
          loanSwapperVault: fixture.redemptionVaultLoanSwapper.address,
          maxLoanApr: 0,
          loanApr: 0,
        },
      );

    await redemptionVaultWithSwapper?.addWaivedFeeAccount(
      fixture.redemptionVault.address,
    );
    return {
      ...fixture,
      tokenContract,
      tokenDataFeed: dataFeed,
      tokenCustomAggregatorFeed: customAggregatorFeed,
      tokenDepositVault: depositVault,
      tokenDepositVaultUstb: depositVaultUstb,
      tokenRedemptionVault: redemptionVault,
      tokenRedemptionVaultWithSwapper: redemptionVaultWithSwapper,
      tokenCustomAggregatorFeedGrowth: customAggregatorFeedGrowth,
    };
  };

  describe(`Token`, function () {
    it('deployment', async () => {
      const { tokenContract } = await deployMTokenWithFixture();

      const expected = mTokensMetadata[token];
      expect(await tokenContract.name()).eq(expected.name);
      expect(await tokenContract.symbol()).eq(expected.symbol);

      expect(await tokenContract.paused()).eq(false);

      const limits = await tokenContract.getMintRateLimitStatuses();

      expect(limits.length).eq(0);
    });

    it('roles', async () => {
      const { tokenContract, accessControl } = await deployMTokenWithFixture();

      const contract = tokenContract as Contract;

      expect(await contract[tokenRoleNames.burner]()).eq(tokenRoles.burner);
      expect(await contract[tokenRoleNames.minter]()).eq(tokenRoles.minter);
      expect(await contract[tokenRoleNames.pauser]()).eq(tokenRoles.pauser);

      // TODO: check the token manager role
      expect(await accessControl.DEFAULT_ADMIN_ROLE()).eq(
        allRoles.common.defaultAdmin,
      );
      expect(await contract[allRoleNames.blacklistedOperator]()).eq(
        allRoles.common.blacklistedOperator,
      );
      expect(await contract[allRoleNames.greenlistedOperator]()).eq(
        allRoles.common.greenlistedOperator,
      );
    });

    it('initialize and v2 initialize', async () => {
      const { tokenContract, clawbackReceiver } =
        await deployMTokenWithFixture();

      await expect(
        tokenContract.initialize(
          ethers.constants.AddressZero,
          clawbackReceiver.address,
        ),
      ).revertedWith('Initializable: contract is already initialized');

      await expect(
        tokenContract.initializeV2(clawbackReceiver.address),
      ).to.revertedWith('Initializable: contract is already initialized');
    });

    describe('mint()', () => {
      it('should fail: call from address without "mint operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
        const caller = regularAccounts[0];

        await mint({ tokenContract, owner }, owner, 0, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
        });
      });

      it('call from address with "mint operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const amount = parseUnits('100');
        const to = regularAccounts[0].address;

        await mint({ tokenContract, owner }, to, amount);
      });

      it('when 1h limit is set but not exceeded', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
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
          const { owner, tokenContract, regularAccounts } =
            await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

        await adminPauseContractTest({ pauseManager, owner }, tokenContract);
        await mint(
          { tokenContract, owner },
          regularAccounts[0],
          PAUSE_TEST_AMOUNT,
          pausedRevert(tokenContract, MINT_SEL),
        );
      });

      it('should fail: mint when ERC20Pausable is paused', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        await setErc20PausablePaused(tokenContract);
        await mint(
          { tokenContract, owner },
          regularAccounts[0],
          PAUSE_TEST_AMOUNT,
          { revertMessage: ERC20_PAUSED_MSG },
        );
      });

      it('mint after contract admin unpause by pause manager', async () => {
        const fixture = await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await burn({ tokenContract, owner }, owner, 0, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
        });
      });

      it('should fail: call when user has insufficient balance', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const amount = parseUnits('100');
        const to = regularAccounts[0].address;

        await burn({ tokenContract, owner }, to, amount, {
          revertMessage: 'ERC20: burn amount exceeds balance',
        });
      });

      it('call from address with "mint operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const amount = parseUnits('100');
        const to = regularAccounts[0].address;

        await mint({ tokenContract, owner }, to, amount);
        await burn({ tokenContract, owner }, to, amount);
      });

      it('burn is not affected by mint rate limits', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

        await adminPauseContractTest({ pauseManager, owner }, tokenContract);
        await mint(
          { tokenContract, owner, isGoverned: true },
          regularAccounts[0],
          PAUSE_TEST_AMOUNT,
          pausedRevert(tokenContract, MINT_GOVERNED_SEL),
        );
      });

      it('should fail: mintGoverned when ERC20Pausable is paused', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

        await mint({ tokenContract, owner }, owner, PAUSE_TEST_AMOUNT);
        await pauseVaultFn(
          { pauseManager, owner },
          tokenContract,
          TRANSFER_SEL,
        );
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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await setMetadataTest({ tokenContract, owner }, 'url', 'some value', {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
        });
      });

      it('call from address with token manager role', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();

        await setMetadataTest(
          { tokenContract, owner },
          'url',
          'some value',
          undefined,
        );
      });

      it('call when globally paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();

        await pauseGlobalTest({ pauseManager, owner });
        await setMetadataTest(
          { tokenContract, owner },
          'url',
          'some value',
          undefined,
        );
      });

      it('call when contract is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();

        await pauseVault({ pauseManager, owner }, tokenContract);
        await setMetadataTest(
          { tokenContract, owner },
          'url',
          'some value',
          undefined,
        );
      });

      it('call when setMetadata is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract } = await deployMTokenWithFixture();

        await setClawbackReceiverTest(
          { tokenContract, owner },
          ethers.constants.AddressZero,
          { revertCustomError: { customErrorName: 'InvalidAddress' } },
        );
      });

      it('call from address with token manager role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        await setClawbackReceiverTest(
          { tokenContract, owner },
          regularAccounts[2].address,
          undefined,
        );
      });

      it('call from address with scoped function permission only', async () => {
        const { owner, tokenContract, regularAccounts, accessControl } =
          await deployMTokenWithFixture();

        const user = regularAccounts[0];
        const nextReceiver = regularAccounts[3].address;
        const selector = encodeFnSelector('setClawbackReceiver(address)');

        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: allRoles.common.defaultAdmin,
          targetContract: tokenContract.address,
          functionSelector: selector,
          grantOperator: owner,
        });

        await setFunctionPermissionTester(
          { accessControl, owner },
          allRoles.common.defaultAdmin,
          tokenContract.address,
          selector,
          [{ account: user.address, enabled: true }],
        );

        expect(
          await accessControl.hasRole(
            allRoles.common.defaultAdmin,
            user.address,
          ),
        ).eq(false);

        await setClawbackReceiverTest({ tokenContract, owner }, nextReceiver, {
          from: user,
        });
      });

      it('call when globally paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        await pauseGlobalTest({ pauseManager, owner });
        await setClawbackReceiverTest(
          { tokenContract, owner },
          regularAccounts[1].address,
          undefined,
        );
      });

      it('call when contract is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        await pauseVault({ pauseManager, owner }, tokenContract);
        await setClawbackReceiverTest(
          { tokenContract, owner },
          regularAccounts[1].address,
          undefined,
        );
      });

      it('call when setClawbackReceiver is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const holder = regularAccounts[0];
        const amount = parseUnits('7');

        await mint({ tokenContract, owner }, holder, amount);
        await clawbackTest({ tokenContract, owner }, amount, holder, undefined);
      });

      it('call from address with scoped function permission only', async () => {
        const { owner, tokenContract, regularAccounts, accessControl } =
          await deployMTokenWithFixture();

        const operator = regularAccounts[0];
        const holder = regularAccounts[1];
        const amount = parseUnits('3');
        const selector = encodeFnSelector('clawback(uint256,address)');

        await mint({ tokenContract, owner }, holder, amount);

        await setupFunctionAccessGrantOperator({
          accessControl,
          owner,
          functionAccessAdminRole: allRoles.common.defaultAdmin,
          targetContract: tokenContract.address,
          functionSelector: selector,
          grantOperator: owner,
        });

        await setFunctionPermissionTester(
          { accessControl, owner },
          allRoles.common.defaultAdmin,
          tokenContract.address,
          selector,
          [{ account: operator.address, enabled: true }],
        );

        expect(
          await accessControl.hasRole(
            allRoles.common.defaultAdmin,
            operator.address,
          ),
        ).eq(false);

        await clawbackTest({ tokenContract, owner }, amount, holder, {
          from: operator,
        });
      });

      it('should fail: clawback when contract is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

        const holder = regularAccounts[0];
        await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
        await pauseVaultFn(
          { pauseManager, owner },
          tokenContract,
          CLAWBACK_SEL,
        );
        await clawbackTest(
          { tokenContract, owner },
          PAUSE_TEST_AMOUNT,
          holder,
          pausedRevert(tokenContract, CLAWBACK_SEL),
        );
      });

      it('should fail: clawback when globally paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const holder = regularAccounts[0];
        await mint({ tokenContract, owner }, holder, PAUSE_TEST_AMOUNT);
        await setErc20PausablePaused(tokenContract);
        await clawbackTest(
          { tokenContract, owner },
          PAUSE_TEST_AMOUNT,
          holder,
          { revertMessage: ERC20_PAUSED_MSG },
        );
      });
    });

    describe('increaseMintRateLimit()', () => {
      it('should fail: call from address without token manager role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await increaseMintRateLimitTest({ tokenContract, owner }, days(1), 1, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
        });
      });

      it('should fail: call with new limit <= existing limit', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();
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
        const { owner, tokenContract } = await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimitTest({ tokenContract, owner }, window, 100);
        await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
      });

      it('should fail: when window is shorter than 1 minute', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();

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
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();

        await pauseGlobalTest({ pauseManager, owner });
        await increaseMintRateLimitTest(
          { tokenContract, owner },
          days(1),
          parseUnits('1000'),
        );
      });

      it('call when contract is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();

        await pauseVault({ pauseManager, owner }, tokenContract);
        await increaseMintRateLimitTest(
          { tokenContract, owner },
          days(1),
          parseUnits('1000'),
        );
      });

      it('call when increaseMintRateLimit is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();

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
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await decreaseMintRateLimitTest({ tokenContract, owner }, days(1), 1, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
        });
      });

      it('should fail: call with new limit >= existing limit', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();
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
        const { owner, tokenContract } = await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
        await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      });

      it('call when globally paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
        await pauseGlobalTest({ pauseManager, owner });
        await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      });

      it('call when contract is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimitTest({ tokenContract, owner }, window, 200);
        await pauseVault({ pauseManager, owner }, tokenContract);
        await decreaseMintRateLimitTest({ tokenContract, owner }, window, 100);
      });

      it('call when decreaseMintRateLimit is paused by pause manager', async () => {
        const { pauseManager, owner, tokenContract } =
          await deployMTokenWithFixture();
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

    describe('_beforeTokenTransfer()', () => {
      it('should fail: mint(...) when address is blacklisted', async () => {
        const { owner, regularAccounts, accessControl, tokenContract } =
          await deployMTokenWithFixture();
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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
          await deployMTokenWithFixture();

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
        const { owner, regularAccounts, tokenContract } =
          await deployMTokenWithFixture();
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

  it('roles check', async () => {
    // 'DataFeed' contract checks

    const fixture = await deployMTokenVaultsWithFixture();
    const dataFeed = fixture.tokenDataFeed as Contract;

    if (dataFeed && tokenRoleNames.customFeedAdmin && !isTac) {
      expect(await dataFeed.feedAdminRole()).eq(
        await dataFeed[tokenRoleNames.customFeedAdmin](),
      );
      expect(await dataFeed.feedAdminRole()).eq(tokenRoles.customFeedAdmin);
    }

    // 'CustomAggregator' contract checks
    const customAggregator = fixture.tokenCustomAggregatorFeed as Contract;

    if (customAggregator && tokenRoleNames.customFeedAdmin && !isTac) {
      expect(await customAggregator.feedAdminRole()).eq(
        await customAggregator[tokenRoleNames.customFeedAdmin](),
      );
      expect(await customAggregator.feedAdminRole()).eq(
        tokenRoles.customFeedAdmin,
      );
    }

    // 'CustomAggregatorGrowth' contract checks
    const customAggregatorGrowth =
      fixture.tokenCustomAggregatorFeedGrowth as Contract;

    if (customAggregatorGrowth && tokenRoleNames.customFeedAdmin && !isTac) {
      expect(await customAggregatorGrowth.feedAdminRole()).eq(
        await customAggregatorGrowth[tokenRoleNames.customFeedAdmin](),
      );
      expect(await customAggregatorGrowth.feedAdminRole()).eq(
        tokenRoles.customFeedAdmin,
      );
    }

    // 'DepositVault' contract checks
    const depositVault = fixture.tokenDepositVault as Contract;

    if (depositVault) {
      expect(await depositVault.vaultRole()).eq(
        token === 'mTBILL'
          ? tokenRoles.depositVaultAdmin
          : await depositVault[tokenRoleNames.depositVaultAdmin](),
      );
      expect(await depositVault.vaultRole()).eq(tokenRoles.depositVaultAdmin);
    }

    // 'DepositVaultWithUSTB' contract checks
    const depositVaultUstb = fixture.tokenDepositVaultUstb as Contract;

    if (depositVaultUstb) {
      expect(await depositVaultUstb.vaultRole()).eq(
        token === 'mTBILL'
          ? tokenRoles.depositVaultAdmin
          : await depositVaultUstb[tokenRoleNames.depositVaultAdmin](),
      );
      expect(await depositVaultUstb.vaultRole()).eq(
        tokenRoles.depositVaultAdmin,
      );
    }

    // 'RedemptionVault' contract checks
    const redemptionVault = fixture.tokenRedemptionVault as Contract;

    if (redemptionVault) {
      expect(await redemptionVault.vaultRole()).eq(
        token === 'mTBILL'
          ? tokenRoles.redemptionVaultAdmin
          : await redemptionVault[tokenRoleNames.redemptionVaultAdmin](),
      );
      expect(await redemptionVault.vaultRole()).eq(
        tokenRoles.redemptionVaultAdmin,
      );
    }

    // 'RedemptionVaultWithSwapper' contract checks
    const redemptionVaultWithSwapper =
      fixture.tokenRedemptionVaultWithSwapper as Contract;

    if (redemptionVaultWithSwapper) {
      expect(await redemptionVaultWithSwapper.vaultRole()).eq(
        token === 'mTBILL'
          ? tokenRoles.redemptionVaultAdmin
          : await redemptionVaultWithSwapper[
              tokenRoleNames.redemptionVaultAdmin
            ](),
      );
      expect(await redemptionVaultWithSwapper.vaultRole()).eq(
        tokenRoles.redemptionVaultAdmin,
      );
    }
  });
};
