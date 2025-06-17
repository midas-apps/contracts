import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';

import { acErrors, blackList, unBlackList } from './ac.helpers';
import { defaultDeploy } from './fixtures';
import { burn, mint, setMetadataTest } from './mTBILL.helpers';

import { MTokenName } from '../../config';
import { getTokenContractNames } from '../../helpers/contracts';
import {
  getAllRoles,
  getRolesForToken,
  getRolesNamesCommon,
  getRolesNamesForToken,
} from '../../helpers/roles';
import {
  CustomAggregatorV3CompatibleFeed,
  DataFeed,
  DepositVault,
  MTBILL,
  RedemptionVault,
  RedemptionVaultWIthBUIDL,
  RedemptionVaultWithSwapper,
} from '../../typechain-types';

const expectedTokenNameSymb: Record<
  MTokenName,
  { name: string; symbol: string }
> = {
  mTBILL: {
    name: 'Midas US Treasury Bill Token',
    symbol: 'mTBILL',
  },
  mBASIS: {
    name: 'Midas Basis Trading Token',
    symbol: 'mBASIS',
  },
  mBTC: {
    name: 'Midas BTC Yield Token',
    symbol: 'mBTC',
  },
  mEDGE: {
    name: 'Midas mEDGE',
    symbol: 'mEDGE',
  },
  mRE7: {
    name: 'Midas Re7 Yield',
    symbol: 'mRe7YIELD',
  },
  mMEV: {
    name: 'Midas MEV',
    symbol: 'mMEV',
  },
  mSL: {
    name: 'Midas Staked Liquidity',
    symbol: 'mSL',
  },
  mFONE: {
    name: 'Midas Fasanara ONE',
    symbol: 'mF-ONE',
  },
  hbUSDT: {
    name: 'Hyperbeat USDT',
    symbol: 'hbUSDT',
  },
  hypeBTC: {
    name: 'HyperBTC Vault',
    symbol: 'hypeBTC',
  },
  hypeETH: {
    name: 'HyperETH Vault',
    symbol: 'hypeETH',
  },
  hypeUSD: {
    name: 'HyperUSD Vault',
    symbol: 'hypeUSD',
  },
  TACmBTC: {
    name: 'Midas TACmBTC Token',
    symbol: 'TACmBTC',
  },
  TACmEDGE: {
    name: 'Midas TACmEDGE Token',
    symbol: 'TACmEDGE',
  },
  TACmMEV: {
    name: 'Midas TACmMEV Token',
    symbol: 'TACmMEV',
  },
  mLIQUIDITY: {
    name: 'Midas mLIQUIDITY',
    symbol: 'mLIQUIDITY',
  },
  tUSDe: {
    name: 'Terminal USDe',
    symbol: 'tUSDe',
  },
  tBTC: {
    name: 'Terminal WBTC',
    symbol: 'tBTC',
  },
  tETH: {
    name: 'Terminal WETH',
    symbol: 'tETH',
  },
  hbXAUt: {
    name: 'Hyperbeat XAUt',
    symbol: 'hbXAUt',
  },
};

export const tokenContractsTests = (token: MTokenName) => {
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
    contractKey: keyof typeof contractNames,
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
    contractKey: keyof typeof contractNames,
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
      await deployProxyContract<CustomAggregatorV3CompatibleFeed>(
        'customAggregator',
        undefined,
        fixture.accessControl.address,
        2,
        parseUnits('10000', 8),
        parseUnits('1', 8),
        'Custom Data Feed',
      );

    await customAggregatorFeed.setRoundData(parseUnits('1.01', 8));

    const dataFeed = await deployProxyContract<DataFeed>(
      'dataFeed',
      undefined,
      fixture.accessControl.address,
      customAggregatorFeed.address,
      3 * 24 * 3600,
      parseUnits('0.1', 8),
      parseUnits('10000', 8),
    );

    const depositVault = await deployProxyContract<DepositVault>(
      'dv',
      undefined,
      fixture.accessControl.address,
      {
        mToken: tokenContract.address,
        mTokenDataFeed: dataFeed.address,
      },
      {
        feeReceiver: fixture.feeReceiver.address,
        tokensReceiver: fixture.tokensReceiver.address,
      },
      {
        instantFee: 100,
        instantDailyLimit: parseUnits('100000'),
      },
      fixture.mockedSanctionsList.address,
      1,
      parseUnits('100'),
      0,
    );

    const redemptionVault = await deployProxyContractIfExists<RedemptionVault>(
      'rv',
      undefined,
      fixture.accessControl.address,
      {
        mToken: tokenContract.address,
        mTokenDataFeed: dataFeed.address,
      },
      {
        feeReceiver: fixture.feeReceiver.address,
        tokensReceiver: fixture.tokensReceiver.address,
      },
      {
        instantFee: 100,
        instantDailyLimit: parseUnits('100000'),
      },
      fixture.mockedSanctionsList.address,
      1,
      1000,
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: 1000,
      },
      fixture.requestRedeemer.address,
    );

    const redemptionVaultWithSwapper =
      await deployProxyContractIfExists<RedemptionVaultWithSwapper>(
        'rvSwapper',
        'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)',
        fixture.accessControl.address,
        {
          mToken: tokenContract.address,
          mTokenDataFeed: dataFeed.address,
        },
        {
          feeReceiver: fixture.feeReceiver.address,
          tokensReceiver: fixture.tokensReceiver.address,
        },
        {
          instantFee: 100,
          instantDailyLimit: parseUnits('100000'),
        },
        fixture.mockedSanctionsList.address,
        1,
        1000,
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: 1000,
        },
        fixture.requestRedeemer.address,
        fixture.redemptionVault.address,
        fixture.liquidityProvider.address,
      );

    await redemptionVaultWithSwapper?.addWaivedFeeAccount(
      fixture.redemptionVault.address,
    );

    const redemptionVaultWithBuidl =
      await deployProxyContractIfExists<RedemptionVaultWIthBUIDL>(
        'rvBuidl',
        'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)',
        fixture.accessControl.address,
        {
          mToken: tokenContract.address,
          mTokenDataFeed: dataFeed.address,
        },
        {
          feeReceiver: fixture.feeReceiver.address,
          tokensReceiver: fixture.tokensReceiver.address,
        },
        {
          instantFee: 100,
          instantDailyLimit: parseUnits('100000'),
        },
        fixture.mockedSanctionsList.address,
        1,
        1000,
        {
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('1'),
          minFiatRedeemAmount: 1000,
        },
        fixture.requestRedeemer.address,
        fixture.buidlRedemption.address,
        parseUnits('250000', 6),
        parseUnits('250000', 6),
      );

    return {
      ...fixture,
      tokenContract,
      tokenDataFeed: dataFeed,
      tokenCustomAggregatorFeed: customAggregatorFeed,
      tokenDepositVault: depositVault,
      tokenRedemptionVault: redemptionVault,
      tokenRedemptionVaultWithSwapper: redemptionVaultWithSwapper,
      tokenRedemptionVaultWithBuidl: redemptionVaultWithBuidl,
    };
  };

  describe(`Token`, function () {
    it('deployment', async () => {
      const { tokenContract } = await deployMTokenWithFixture();

      const expected = expectedTokenNameSymb[token];
      expect(await tokenContract.name()).eq(expected.name);
      expect(await tokenContract.symbol()).eq(expected.symbol);

      expect(await tokenContract.paused()).eq(false);
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

        await expect(tokenContract.connect(caller).pause()).revertedWith(
          acErrors.WMAC_HASNT_ROLE,
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
        await expect(tokenContract.connect(caller).unpause()).revertedWith(
          acErrors.WMAC_HASNT_ROLE,
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
          revertMessage: acErrors.WMAC_HASNT_ROLE,
        });
      });

      it('call from address with "mint operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const amount = parseUnits('100');
        const to = regularAccounts[0].address;

        await mint({ tokenContract, owner }, to, amount);
      });
    });

    describe('burn()', () => {
      it('should fail: call from address without "burn operator" role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await burn({ tokenContract, owner }, owner, 0, {
          from: caller,
          revertMessage: acErrors.WMAC_HASNT_ROLE,
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
    });

    describe('setMetadata()', () => {
      it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
        const { owner, tokenContract, regularAccounts } =
          await deployMTokenWithFixture();

        const caller = regularAccounts[0];

        await setMetadataTest({ tokenContract, owner }, 'url', 'some value', {
          from: caller,
          revertMessage: acErrors.WMAC_HASNT_ROLE,
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
          revertMessage: acErrors.WMAC_HAS_ROLE,
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);

        await unBlackList(
          { blacklistable: tokenContract, accessControl, owner },
          blacklisted,
        );

        await expect(tokenContract.connect(blacklisted).transfer(to.address, 1))
          .not.reverted;
      });
    });
  });
  describe('roles check', () => {
    it('DataFeed', async function () {
      const fixture = await deployMTokenVaultsWithFixture();
      const dataFeed = fixture.tokenDataFeed as Contract;

      if (!dataFeed || !tokenRoleNames.customFeedAdmin || isTac) {
        (this as any).skip();
        return;
      }

      expect(await dataFeed.feedAdminRole()).eq(
        await dataFeed[tokenRoleNames.customFeedAdmin](),
      );
      expect(await dataFeed.feedAdminRole()).eq(tokenRoles.customFeedAdmin);
    });

    it('CustomAggregator', async function () {
      const fixture = await deployMTokenVaultsWithFixture();
      const customAggregator = fixture.tokenCustomAggregatorFeed as Contract;

      if (!customAggregator || !tokenRoleNames.customFeedAdmin || isTac) {
        (this as any).skip();
        return;
      }

      expect(await customAggregator.feedAdminRole()).eq(
        await customAggregator[tokenRoleNames.customFeedAdmin](),
      );
      expect(await customAggregator.feedAdminRole()).eq(
        tokenRoles.customFeedAdmin,
      );
    });

    it('DepositVault', async function () {
      const fixture = await deployMTokenVaultsWithFixture();
      const depositVault = fixture.tokenDepositVault as Contract;

      if (!depositVault) {
        (this as any).skip();
        return;
      }

      expect(await depositVault.vaultRole()).eq(
        await depositVault[tokenRoleNames.depositVaultAdmin](),
      );
      expect(await depositVault.vaultRole()).eq(tokenRoles.depositVaultAdmin);
    });

    it('RedemptionVault', async function () {
      const fixture = await deployMTokenVaultsWithFixture();
      const redemptionVault = fixture.tokenRedemptionVault as Contract;

      if (!redemptionVault) {
        (this as any).skip();
        return;
      }

      expect(await redemptionVault.vaultRole()).eq(
        await redemptionVault[tokenRoleNames.redemptionVaultAdmin](),
      );
      expect(await redemptionVault.vaultRole()).eq(
        tokenRoles.redemptionVaultAdmin,
      );
    });

    it('RedemptionVaultWithSwapper', async function () {
      const fixture = await deployMTokenVaultsWithFixture();
      const redemptionVaultWithSwapper =
        fixture.tokenRedemptionVaultWithSwapper as Contract;

      if (!redemptionVaultWithSwapper) {
        (this as any).skip();
        return;
      }

      expect(await redemptionVaultWithSwapper.vaultRole()).eq(
        await redemptionVaultWithSwapper[tokenRoleNames.redemptionVaultAdmin](),
      );
      expect(await redemptionVaultWithSwapper.vaultRole()).eq(
        tokenRoles.redemptionVaultAdmin,
      );
    });

    it('RedemptionVaultWithBUIDL', async function () {
      const fixture = await deployMTokenVaultsWithFixture();
      const redemptionVaultWithBuidl =
        fixture.tokenRedemptionVaultWithBuidl as Contract;

      if (!redemptionVaultWithBuidl) {
        (this as any).skip();
        return;
      }

      expect(await redemptionVaultWithBuidl.vaultRole()).eq(
        await redemptionVaultWithBuidl[tokenRoleNames.redemptionVaultAdmin](),
      );
      expect(await redemptionVaultWithBuidl.vaultRole()).eq(
        tokenRoles.redemptionVaultAdmin,
      );
    });
  });
};
