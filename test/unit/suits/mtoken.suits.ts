import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
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
import {
  acErrors,
  blackList,
  unBlackList,
} from '../../../test/common/ac.helpers';
import { defaultDeploy } from '../../../test/common/fixtures';
import {
  burn,
  decreaseMintRateLimit,
  increaseMintRateLimit,
  mint,
  setMetadataTest,
} from '../../../test/common/mTBILL.helpers';
import {
  CustomAggregatorV3CompatibleFeed,
  CustomAggregatorV3CompatibleFeedGrowth,
  DataFeed,
  DepositVault,
  DepositVaultWithUSTB,
  MTBILL,
  RedemptionVault,
  RedemptionVaultWithSwapper,
} from '../../../typechain-types';

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

    const tokenContract = (await deployProxyContract(
      'token',
      undefined,
      fixture.accessControl.address,
    )) as MTBILL;

    return { tokenContract, ...fixture };
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

    const depositVault = await deployProxyContract<DepositVault>(
      'dv',
      undefined,
      {
        ac: fixture.accessControl.address,
        sanctionsList: fixture.mockedSanctionsList.address,
        variationTolerance: 1,
        minAmount: parseUnits('100'),
        mToken: tokenContract.address,
        mTokenDataFeed: dataFeed.address,
        feeReceiver: fixture.feeReceiver.address,
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
          feeReceiver: fixture.feeReceiver.address,
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
        feeReceiver: fixture.feeReceiver.address,
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
        loanLpFeeReceiver: fixture.loanLpFeeReceiver.address,
        loanRepaymentAddress: fixture.loanRepaymentAddress.address,
        loanSwapperVault: fixture.redemptionVaultLoanSwapper.address,
        maxLoanApr: 0,
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
          feeReceiver: fixture.feeReceiver.address,
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
          loanLpFeeReceiver: fixture.loanLpFeeReceiver.address,
          loanRepaymentAddress: fixture.loanRepaymentAddress.address,
          loanSwapperVault: fixture.redemptionVaultLoanSwapper.address,
          maxLoanApr: 0,
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

      const limits = await tokenContract.getMintRateLimitConfigs();

      expect(limits.windows.length).eq(0);
      expect(limits.configs.length).eq(0);
    });

    it('roles', async () => {
      const { tokenContract } = await deployMTokenWithFixture();

      const contract = tokenContract as Contract;

      expect(await contract[tokenRoleNames.burner]()).eq(tokenRoles.burner);
      expect(await contract[tokenRoleNames.minter]()).eq(tokenRoles.minter);
      expect(await contract[tokenRoleNames.pauser]()).eq(tokenRoles.pauser);

      expect(await contract[allRoleNames.defaultAdmin]()).eq(
        allRoles.common.defaultAdmin,
      );
      expect(await contract[allRoleNames.blacklistedOperator]()).eq(
        allRoles.common.blacklistedOperator,
      );
      expect(await contract[allRoleNames.greenlistedOperator]()).eq(
        allRoles.common.greenlistedOperator,
      );
    });

    it('initialize', async () => {
      const { tokenContract } = await deployMTokenWithFixture();

      await expect(
        tokenContract.initialize(ethers.constants.AddressZero),
      ).revertedWith('Initializable: contract is already initialized');
    });

    describe('pause()', () => {
      it('should fail: call from address without "token pauser" role', async () => {
        const { accessControl, regularAccounts, tokenContract } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await expect(
          tokenContract.connect(caller).pause(),
        ).revertedWithCustomError(
          tokenContract,
          acErrors.WMAC_HASNT_ROLE().customErrorName,
        );
      });

      it('should fail: call when already paused', async () => {
        const { accessControl, tokenContract, owner } =
          await deployMTokenWithFixture();

        await tokenContract.connect(owner).pause();
        await expect(tokenContract.connect(owner).pause()).revertedWith(
          `Pausable: paused`,
        );
      });

      it('call when unpaused', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();

        expect(await tokenContract.paused()).eq(false);
        await expect(tokenContract.connect(owner).pause()).to.emit(
          tokenContract,
          tokenContract.interface.events['Paused(address)'].name,
        ).to.not.reverted;
        expect(await tokenContract.paused()).eq(true);
      });
    });

    describe('unpause()', () => {
      it('should fail: call from address without "token pauser" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await tokenContract.connect(owner).pause();
        await expect(
          tokenContract.connect(caller).unpause(),
        ).revertedWithCustomError(
          tokenContract,
          acErrors.WMAC_HASNT_ROLE().customErrorName,
        );
      });

      it('should fail: call when already paused', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();

        await expect(tokenContract.connect(owner).unpause()).revertedWith(
          `Pausable: not paused`,
        );
      });

      it('call when paused', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();

        expect(await tokenContract.paused()).eq(false);
        await tokenContract.connect(owner).pause();
        expect(await tokenContract.paused()).eq(true);

        await expect(tokenContract.connect(owner).unpause()).to.emit(
          tokenContract,
          tokenContract.interface.events['Unpaused(address)'].name,
        ).to.not.reverted;

        expect(await tokenContract.paused()).eq(false);
      });
    });

    describe('mint()', () => {
      it('should fail: call from address without "mint operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
        const caller = regularAccounts[0];

        await mint({ tokenContract, owner }, owner, 0, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_ROLE,
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

        await increaseMintRateLimit(
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

        await increaseMintRateLimit(
          { tokenContract, owner },
          3600,
          parseUnits('1000'),
        );
        await increaseMintRateLimit(
          { tokenContract, owner },
          3600 * 10,
          parseUnits('10000'),
        );

        await mint({ tokenContract, owner }, to, amount);
      });

      it('should fail: mint when amount exceeds mint rate limit', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
        const to = regularAccounts[0];
        const window = days(1);

        await increaseMintRateLimit({ tokenContract, owner }, window, 100);
        await mint({ tokenContract, owner }, to, 100);
        await mint({ tokenContract, owner }, to, 1, {
          revertCustomError: {
            customErrorName: 'MintRateLimitExceeded',
            args: [window, 101, 100],
          },
        });
      });

      it('should fail: mint when one of multiple mint rate limits is exceeded', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();
        const to = regularAccounts[0];
        const longWindow = days(1);
        const shortWindow = 60;

        await increaseMintRateLimit({ tokenContract, owner }, longWindow, 100);
        await increaseMintRateLimit({ tokenContract, owner }, shortWindow, 50);

        await mint({ tokenContract, owner }, to, 60, {
          revertCustomError: {
            customErrorName: 'MintRateLimitExceeded',
            args: [shortWindow, 60, 50],
          },
        });
      });
    });

    describe('burn()', () => {
      it('should fail: call from address without "burn operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await burn({ tokenContract, owner }, owner, 0, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_ROLE,
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

        await increaseMintRateLimit({ tokenContract, owner }, window, 100);
        await mint({ tokenContract, owner }, holder, 100);
        await mint({ tokenContract, owner }, holder, 1, {
          revertCustomError: {
            customErrorName: 'MintRateLimitExceeded',
            args: [window, 101, 100],
          },
        });

        await burn({ tokenContract, owner }, holder, 50);
      });
    });

    describe('setMetadata()', () => {
      it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await setMetadataTest({ tokenContract, owner }, 'url', 'some value', {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_ROLE,
        });
      });

      it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();

        await setMetadataTest(
          { tokenContract, owner },
          'url',
          'some value',
          undefined,
        );
      });
    });

    describe('increaseMintRateLimit()', () => {
      it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await increaseMintRateLimit({ tokenContract, owner }, days(1), 1, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_ROLE,
        });
      });

      it('should fail: call with new limit <= existing limit', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimit({ tokenContract, owner }, window, 100);
        await increaseMintRateLimit({ tokenContract, owner }, window, 100, {
          revertCustomError: {
            customErrorName: 'InvalidNewLimit',
            args: [100, 100],
          },
        });
      });

      it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimit({ tokenContract, owner }, window, 100);
        await increaseMintRateLimit({ tokenContract, owner }, window, 200);
      });
    });

    describe('decreaseMintRateLimit()', () => {
      it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await decreaseMintRateLimit({ tokenContract, owner }, days(1), 1, {
          from: caller,
          revertCustomError: acErrors.WMAC_HASNT_ROLE,
        });
      });

      it('should fail: call with new limit >= existing limit', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimit({ tokenContract, owner }, window, 100);
        await decreaseMintRateLimit({ tokenContract, owner }, window, 100, {
          revertCustomError: {
            customErrorName: 'InvalidNewLimit',
            args: [100, 100],
          },
        });
      });

      it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract } = await deployMTokenWithFixture();
        const window = days(1);

        await increaseMintRateLimit({ tokenContract, owner }, window, 200);
        await decreaseMintRateLimit({ tokenContract, owner }, window, 100);
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
          revertCustomError: acErrors.WMAC_HAS_ROLE,
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
          acErrors.WMAC_HAS_ROLE().customErrorName,
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
          acErrors.WMAC_HAS_ROLE().customErrorName,
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
          acErrors.WMAC_HAS_ROLE().customErrorName,
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
          acErrors.WMAC_HAS_ROLE().customErrorName,
        );
      });

      it('burn(...) when address is blacklisted', async () => {
        const { owner, regularAccounts, accessControl, tokenContract } =
          await deployMTokenWithFixture();

        const blacklisted = regularAccounts[0];

        await mint({ tokenContract, owner }, blacklisted, 1);
        await blackList(
          { blacklistable: tokenContract, accessControl, owner },
          blacklisted,
        );
        await burn({ tokenContract, owner }, blacklisted, 1);
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
          acErrors.WMAC_HAS_ROLE().customErrorName,
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

        await increaseMintRateLimit({ tokenContract, owner }, dayWindow, 1);
        await decreaseMintRateLimit({ tokenContract, owner }, dayWindow, 0);
        await increaseMintRateLimit({ tokenContract, owner }, minuteWindow, 1);
        await decreaseMintRateLimit({ tokenContract, owner }, minuteWindow, 0);

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
