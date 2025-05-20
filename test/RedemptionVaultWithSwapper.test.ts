import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { acErrors, blackList } from './common/ac.helpers';
import {
  approveBase18,
  mintToken,
  pauseVaultFn,
} from './common/common.helpers';
import { setRoundData } from './common/data-feed.helpers';
import { defaultDeploy } from './common/fixtures';
import {
  addPaymentTokenTest,
  changeTokenAllowanceTest,
  setInstantFeeTest,
  setInstantDailyLimitTest,
  setMinAmountTest,
  changeTokenFeeTest,
} from './common/manageable-vault.helpers';
import {
  redeemInstantWithSwapperTest,
  setLiquidityProviderTest,
  setSwapperVaultTest,
} from './common/mbasis-redemption-vault.helpers';
import { sanctionUser } from './common/with-sanctions-list.helpers';

import { encodeFnSelector } from '../helpers/utils';
import {
  // eslint-disable-next-line camelcase
  RedemptionVaultWithSwapperTest__factory,
} from '../typechain-types';

describe('MBasisRedemptionVaultWithSwapper', () => {
  describe('deployment', () => {
    it('should fail: cal; initialize() when already initialized', async () => {
      const { redemptionVaultWithSwapper } = await loadFixture(defaultDeploy);

      await expect(
        redemptionVaultWithSwapper[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
        ](
          constants.AddressZero,
          {
            mToken: constants.AddressZero,
            mTokenDataFeed: constants.AddressZero,
          },
          {
            feeReceiver: constants.AddressZero,
            tokensReceiver: constants.AddressZero,
          },
          {
            instantFee: 0,
            instantDailyLimit: 0,
          },
          constants.AddressZero,
          0,
          0,
          {
            fiatAdditionalFee: 0,
            fiatFlatFee: 0,
            minFiatRedeemAmount: 0,
          },
          constants.AddressZero,
          constants.AddressZero,
          constants.AddressZero,
        ),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: incorrect initialize parameters', async () => {
      const {
        accessControl,
        tokensReceiver,
        feeReceiver,
        mBASIS,
        mBasisToUsdDataFeed,
        mockedSanctionsList,
        owner,
        requestRedeemer,
        liquidityProvider,
        redemptionVault,
      } = await loadFixture(defaultDeploy);

      const redemptionVaultWithSwapper =
        await new RedemptionVaultWithSwapperTest__factory(owner).deploy();

      await expect(
        redemptionVaultWithSwapper[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
        ](
          accessControl.address,
          {
            mToken: mBASIS.address,
            mTokenDataFeed: mBasisToUsdDataFeed.address,
          },
          {
            feeReceiver: feeReceiver.address,
            tokensReceiver: tokensReceiver.address,
          },
          {
            instantFee: 100,
            instantDailyLimit: parseUnits('100000'),
          },
          mockedSanctionsList.address,
          1,
          1000,
          {
            fiatAdditionalFee: 100,
            fiatFlatFee: parseUnits('1'),
            minFiatRedeemAmount: 1000,
          },
          requestRedeemer.address,
          constants.AddressZero,
          liquidityProvider.address,
        ),
      ).to.be.reverted;

      await expect(
        redemptionVaultWithSwapper[
          'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
        ](
          accessControl.address,
          {
            mToken: mBASIS.address,
            mTokenDataFeed: mBasisToUsdDataFeed.address,
          },
          {
            feeReceiver: feeReceiver.address,
            tokensReceiver: tokensReceiver.address,
          },
          {
            instantFee: 100,
            instantDailyLimit: parseUnits('100000'),
          },
          mockedSanctionsList.address,
          1,
          1000,
          {
            fiatAdditionalFee: 100,
            fiatFlatFee: parseUnits('1'),
            minFiatRedeemAmount: 1000,
          },
          requestRedeemer.address,
          redemptionVault.address,
          constants.AddressZero,
        ),
      ).to.be.reverted;
    });
  });

  describe('setLiquidityProvider()', () => {
    it('should fail: call from address without M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithSwapper, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setLiquidityProviderTest(
        { vault: redemptionVaultWithSwapper, owner },
        constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if provider address zero', async () => {
      const { redemptionVaultWithSwapper, owner } = await loadFixture(
        defaultDeploy,
      );
      await setLiquidityProviderTest(
        { vault: redemptionVaultWithSwapper, owner },
        constants.AddressZero,
        { revertMessage: 'zero address' },
      );
    });

    it('should fail: if provider address equal current provider address', async () => {
      const { redemptionVaultWithSwapper, liquidityProvider, owner } =
        await loadFixture(defaultDeploy);
      await setLiquidityProviderTest(
        { vault: redemptionVaultWithSwapper, owner },
        liquidityProvider.address,
        { revertMessage: 'MRVS: already provider' },
      );
    });

    it('call from address with M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithSwapper, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setLiquidityProviderTest(
        { vault: redemptionVaultWithSwapper, owner },
        regularAccounts[0].address,
      );
    });
  });

  describe('setSwapperVault()', () => {
    it('should fail: call from address without M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithSwapper, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setSwapperVaultTest(
        { vault: redemptionVaultWithSwapper, owner },
        constants.AddressZero,
        { revertMessage: acErrors.WMAC_HASNT_ROLE, from: regularAccounts[0] },
      );
    });

    it('should fail: if provider address zero', async () => {
      const { redemptionVaultWithSwapper, owner } = await loadFixture(
        defaultDeploy,
      );
      await setSwapperVaultTest(
        { vault: redemptionVaultWithSwapper, owner },
        constants.AddressZero,
        { revertMessage: 'zero address' },
      );
    });

    it('should fail: if provider address equal current provider address', async () => {
      const { redemptionVaultWithSwapper, redemptionVault, owner } =
        await loadFixture(defaultDeploy);
      await setSwapperVaultTest(
        { vault: redemptionVaultWithSwapper, owner },
        redemptionVault.address,
        { revertMessage: 'MRVS: already provider' },
      );
    });

    it('call from address with M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE role', async () => {
      const { redemptionVaultWithSwapper, regularAccounts, owner } =
        await loadFixture(defaultDeploy);
      await setSwapperVaultTest(
        { vault: redemptionVaultWithSwapper, owner },
        regularAccounts[0].address,
      );
    });
  });
  describe('redeemInstant()', () => {
    it('should fail: when there is no token in vault', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: when trying to redeem 0 amount', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        0,
        {
          revertMessage: 'RV: invalid amount',
        },
      );
    });

    it('should fail: when function paused', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        regularAccounts,
      } = await loadFixture(defaultDeploy);

      await mintToken(mBASIS, regularAccounts[0], 100);
      await approveBase18(
        regularAccounts[0],
        stableCoins.dai,
        redemptionVaultWithSwapper,
        100,
      );
      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      const selector = encodeFnSelector(
        'redeemInstant(address,uint256,uint256)',
      );
      await pauseVaultFn(redemptionVaultWithSwapper, selector);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          from: regularAccounts[0],
          revertMessage: 'Pausable: fn paused',
        },
      );
    });

    it('should fail: call with insufficient allowance', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mBASIS, owner, 100);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });

    it('should fail: call with insufficient balance', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
      } = await loadFixture(defaultDeploy);

      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 15);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        1,
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      );

      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 100);
      await mintToken(mBASIS, owner, 10);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        15,
        {
          revertMessage: 'ERC20: burn amount exceeds balance',
        },
      );
    });

    it('should fail: dataFeed rate 0 ', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
        mockedAggregatorMBasis,
      } = await loadFixture(defaultDeploy);

      await mintToken(mBASIS, owner, 100_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 0);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        10,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );

      await setRoundData({ mockedAggregator }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        10,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 0);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        10,
        {
          revertMessage: 'DF: feed is deprecated',
        },
      );
    });

    it('should fail: if min receive amount greater then actual', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);
      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
          minAmount: parseUnits('10000'),
        },
        stableCoins.dai,
        999,
        {
          revertMessage: 'RVS: minReceiveAmount > actual',
        },
      );
    });

    it('should fail: call for amount < minAmount', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await setMinAmountTest(
        { vault: redemptionVaultWithSwapper, owner },
        100_000,
      );

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'RV: amount < min',
        },
      );
    });

    it('should fail: if exceed allowance of deposit by token', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await changeTokenAllowanceTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai.address,
        100,
      );

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed allowance',
        },
      );
    });

    it('should fail: if redeem daily limit exceeded', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await setInstantDailyLimitTest(
        { vault: redemptionVaultWithSwapper, owner },
        1000,
      );

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        99_999,
        {
          revertMessage: 'MV: exceed limit',
        },
      );
    });

    it('should fail: if some fee = 100%', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        10000,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );
      changeTokenFeeTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai.address,
        0,
      );
      await setInstantFeeTest(
        { vault: redemptionVaultWithSwapper, owner },
        10000,
      );
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'RV: amountMTokenIn < fee',
        },
      );
    });

    it('should fail: greenlist enabled and user not in greenlist ', async () => {
      const {
        owner,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        redemptionVaultWithSwapper,
        mBASIS,
        mBasisToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await redemptionVaultWithSwapper.setGreenlistEnable(true);
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          revertMessage: 'WMAC: hasnt role',
        },
      );
    });

    it('should fail: user in blacklist ', async () => {
      const {
        owner,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        redemptionVaultWithSwapper,
        mBASIS,
        mBasisToUsdDataFeed,
        regularAccounts,
        blackListableTester,
        accessControl,
      } = await loadFixture(defaultDeploy);

      await blackList(
        { blacklistable: blackListableTester, accessControl, owner },
        regularAccounts[0],
      );
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: acErrors.WMAC_HAS_ROLE,
        },
      );
    });

    it('should fail: user in sanctions list', async () => {
      const {
        owner,
        stableCoins,
        mTBILL,
        mTokenToUsdDataFeed,
        redemptionVaultWithSwapper,
        mBASIS,
        mBasisToUsdDataFeed,
        regularAccounts,
        mockedSanctionsList,
      } = await loadFixture(defaultDeploy);

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        regularAccounts[0],
      );
      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
        {
          from: regularAccounts[0],
          revertMessage: 'WSL: sanctioned',
        },
      );
    });

    it('should fail: user try to instant redeem fiat', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
      } = await loadFixture(defaultDeploy);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        await redemptionVaultWithSwapper.MANUAL_FULLFILMENT_TOKEN(),
        99_999,
        {
          revertMessage: 'MV: token not exists',
        },
      );
    });

    it('should fail: liquidity provider do not have mTBILL to swap', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        redemptionVault,
        liquidityProvider,
      } = await loadFixture(defaultDeploy);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 10);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);
      await approveBase18(
        liquidityProvider,
        mTBILL,
        redemptionVaultWithSwapper,
        100_000,
      );

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        200,
        {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        },
      );
    });

    it('redeem 100 mBASIS, when contract have enough DAI and all fees are 0', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await setInstantFeeTest(
        {
          vault: redemptionVaultWithSwapper,
          owner,
        },
        0,
      );

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mBASIS, when contract have enough DAI', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        mockedAggregator,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        0,
        true,
      );

      await setRoundData({ mockedAggregator }, 1);

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
        },
        stableCoins.dai,
        100,
      );
    });

    it('redeem 100 mBASIS, when contract do not have enough DAI and need to use mTBILL vault', async () => {
      const {
        owner,
        redemptionVaultWithSwapper,
        stableCoins,
        mTBILL,
        mBASIS,
        mTokenToUsdDataFeed,
        mBasisToUsdDataFeed,
        dataFeed,
        redemptionVault,
        liquidityProvider,
      } = await loadFixture(defaultDeploy);

      await addPaymentTokenTest(
        { vault: redemptionVaultWithSwapper, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );
      await addPaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.dai,
        dataFeed.address,
        100,
        true,
      );

      await mintToken(mBASIS, owner, 100_000);
      await mintToken(mTBILL, liquidityProvider, 100_000);
      await mintToken(stableCoins.dai, redemptionVaultWithSwapper, 10);
      await mintToken(stableCoins.dai, redemptionVault, 1_000_000);
      await approveBase18(owner, mBASIS, redemptionVaultWithSwapper, 100_000);
      await approveBase18(
        liquidityProvider,
        mTBILL,
        redemptionVaultWithSwapper,
        1000000,
      );

      await redeemInstantWithSwapperTest(
        {
          redemptionVaultWithSwapper,
          owner,
          mTBILL,
          mBASIS,
          mBasisToUsdDataFeed,
          mTokenToUsdDataFeed,
          swap: true,
        },
        stableCoins.dai,
        100,
      );
    });
  });
});
