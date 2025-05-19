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
import { MTBILL } from '../../typechain-types';

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
};

export const tokenContractsTests = (token: MTokenName) => {
  const contractNames = getTokenContractNames(token);
  const allRoles = getAllRoles();
  const allRoleNames = getRolesNamesCommon();

  const tokenRoles = getRolesForToken(token);
  console.log(tokenRoles);
  const tokenRoleNames = getRolesNamesForToken(token);

  const getContractFactory = async (contract: string) => {
    return await ethers.getContractFactory(contract);
  };

  const deployProxyContract = async (
    contractKey: keyof typeof contractNames,
    ...initParams: unknown[]
  ) => {
    const factory = await getContractFactory(contractNames[contractKey]!);

    const impl = await factory.deploy();

    const proxy = await (
      await getContractFactory('ERC1967Proxy')
    ).deploy(
      impl.address,
      factory.interface.encodeFunctionData('initialize', initParams),
    );

    return factory.attach(proxy.address);
  };

  const deployProxyContractIfExists = async (
    contractKey: keyof typeof contractNames,
    ...initParams: unknown[]
  ) => {
    const factory = await getContractFactory(contractNames[contractKey]!).catch(
      (err) => {
        return null;
      },
    );

    if (!factory) {
      return null;
    }

    const impl = await factory.deploy();

    const proxy = await (
      await getContractFactory('ERC1967Proxy')
    ).deploy(
      impl.address,
      factory.interface.encodeFunctionData('initialize', initParams),
    );

    return factory.attach(proxy.address);
  };

  const deployMTokenWithFixture = async () => {
    const fixture = await loadFixture(defaultDeploy);

    const tokenContract = (await deployProxyContract(
      'token',
      fixture.accessControl.address,
    )) as MTBILL;

    return { tokenContract, ...fixture };
  };

  const deployMTokenVaultsWithFixture = async () => {
    const { tokenContract, ...fixture } = await deployMTokenWithFixture();

    const customAggregatorFeed = await deployProxyContract(
      'customAggregator',
      fixture.accessControl.address,
      2,
      parseUnits('10000', 8),
      parseUnits('1', 8),
      'Custom Data Feed',
    );

    await customAggregatorFeed.setRoundData(parseUnits('1', 8));

    const dataFeed = await deployProxyContract(
      'dataFeed',
      fixture.accessControl.address,
      customAggregatorFeed.address,
      3 * 24 * 3600,
      parseUnits('0.1', 8),
      parseUnits('10000', 8),
    );

    const depositVault = await deployProxyContract(
      'dv',
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

    const redemptionVault = await deployProxyContractIfExists(
      'rv',
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
    const redemptionVaultWithSwapper = await deployProxyContractIfExists(
      'rvSwapper',
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
      redemptionVault.address,
      fixture.liquidityProvider.address,
    );
    const redemptionVaultWithBuidl = await deployProxyContractIfExists(
      'rvBuidl',
    );

    return {
      ...fixture,
      tokenContract,
      depositVault,
      redemptionVault,
      redemptionVaultWithSwapper,
      redemptionVaultWithBuidl,
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

  describe('MBtcDepositVault', function () {
    describe('deployment', () => {
      it('vaultRole', async () => {
        const fixture = await loadFixture(defaultDeploy);

        const tester = await new MBtcDepositVault__factory(
          fixture.owner,
        ).deploy();

        expect(await tester.vaultRole()).eq(
          await tester.M_BTC_DEPOSIT_VAULT_ADMIN_ROLE(),
        );
      });
    });

    describe('depositInstant', () => {
      it('mint using 1 WBTC when mBTC/BTC price is 1.', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          otherCoins,
          owner,
          mBtcDepositVault: depositVault,
          WBTCToBtcDataFeed,
        } = fixture;
        await mintToken(otherCoins.wbtc, owner, 1);
        await setMinAmountTest({ vault: depositVault, owner }, 0);
        await approveBase18(owner, otherCoins.wbtc, depositVault, 1);

        await addPaymentTokenTest(
          { vault: depositVault, owner },
          otherCoins.wbtc,
          WBTCToBtcDataFeed.address,
          0,
          true,
        );

        await changeTokenAllowanceTest(
          { vault: depositVault, owner },
          otherCoins.wbtc.address,
          parseUnits('1.1'),
        );

        await depositInstantTest(
          {
            depositVault,
            mTBILL: fixture.mBTC,
            mTokenToUsdDataFeed: fixture.mBTCToBtcDataFeed,
            owner: fixture.owner,
          },
          fixture.otherCoins.wbtc,
          1,
        );
      });
    });
  });

  describe('MBtcRedemptionVault', function () {
    describe('deployment', () => {
      it('vaultRole', async () => {
        const fixture = await loadFixture(defaultDeploy);

        const tester = await new MBtcRedemptionVault__factory(
          fixture.owner,
        ).deploy();

        expect(await tester.vaultRole()).eq(
          await tester.M_BTC_REDEMPTION_VAULT_ADMIN_ROLE(),
        );
      });
    });
    describe('redeemInstant', () => {
      it('redeem 1 mBTC to WBTC when mBTC/BTC price is 1', async () => {
        const fixture = await loadFixture(defaultDeploy);
        const {
          otherCoins,
          owner,
          WBTCToBtcDataFeed,
          mBTC,
          mBtcRedemptionVault: redemptionVault,
        } = fixture;

        await mintToken(mBTC, owner, 1);

        await mintToken(otherCoins.wbtc, redemptionVault, 1.1);

        await setMinAmountTest({ vault: redemptionVault, owner }, 0);

        await approveBase18(owner, mBTC, redemptionVault, 1);

        await addPaymentTokenTest(
          { vault: redemptionVault, owner },
          otherCoins.wbtc,
          WBTCToBtcDataFeed.address,
          0,
          true,
        );

        await changeTokenAllowanceTest(
          { vault: redemptionVault, owner },
          otherCoins.wbtc.address,
          parseUnits('1.1'),
        );

        await redeemInstantTest(
          {
            redemptionVault,
            mTBILL: fixture.mBTC,
            mTokenToUsdDataFeed: fixture.mBTCToBtcDataFeed,
            owner: fixture.owner,
          },
          otherCoins.wbtc.address,
          1,
        );
      });
    });
  });

  describe('MBtcCustomAggregatorFeed', () => {
    it('check admin role', async () => {
      const fixture = await loadFixture(defaultDeploy);

      // eslint-disable-next-line camelcase
      const tester = await new MBtcCustomAggregatorFeed__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.feedAdminRole()).eq(
        await tester.M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
      );
    });
  });
};
