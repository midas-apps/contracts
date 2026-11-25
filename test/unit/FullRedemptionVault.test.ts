import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  increase,
  setNextBlockTimestamp,
} from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { encodeFnSelector } from '../../helpers/utils';
import {
  FullRedemptionVault__factory,
  FullRedemptionVaultTest__factory,
} from '../../typechain-types';
import { NO_DELAY, acErrors, blackList, greenList } from '../common/ac.helpers';
import { mintToken, pauseVault, pauseVaultFn } from '../common/common.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import {
  FRV_TEST_SETTINGS,
  FrvStatus,
  adjustFullRedemptionRateTest,
  cancelFullRedemptionRequestTest,
  claimFullRedemptionTest,
  createFullRedemptionRequestTest,
  fullRedemptionVaultFixture,
  pauseFullRedemptionRequestTest,
  processFullRedemptionRequestTest,
  reallocateFullRedemptionTest,
  safeProcessFullRedemptionRequestsTest,
  unpauseFullRedemptionRequestTest,
  withdrawFullRedemptionTokenTest,
} from '../common/full-redemption-vault.helpers';
import {
  changeTokenFeeTest,
  removePaymentTokenTest,
  setTokensReceiverTest,
  setWaivedFeeAccountTest,
} from '../common/manageable-vault.helpers';
import {
  executeTimelockOperationTester,
  scheduleTimelockOperationTester,
} from '../common/timelock-manager.helpers';
import { sanctionUser } from '../common/with-sanctions-list.helpers';

const CREATE_FN = encodeFnSelector(
  'createRequest(address,address,uint256,uint256)',
);
const PROCESS_FN = encodeFnSelector('processAtCustomRate(uint256,uint256)');
const CLAIM_FN = encodeFnSelector('claim(uint256,uint256,uint256)');

// All amounts and rates in this file are for the tests only.
// In the fixture 1 mToken is 5 USD, the deposit is 2%, the service fee is 4,000 USD.
const mTokens = (amount: number | string) => parseUnits(amount.toString());
const usd = mTokens;
const RATE_5 = parseUnits('5');

describe('FullRedemptionVault', function () {
  describe('deployment', () => {
    it('sets the initial values', async () => {
      const {
        fullRedemptionVault,
        redemptionVault,
        accessControl,
        mockedSanctionsList,
        mTBILL,
        serviceFeeReceiver,
      } = await loadFixture(fullRedemptionVaultFixture);

      expect(await fullRedemptionVault.accessControl()).eq(
        accessControl.address,
      );
      expect(await fullRedemptionVault.sanctionsList()).eq(
        mockedSanctionsList.address,
      );
      expect(await fullRedemptionVault.redemptionVault()).eq(
        redemptionVault.address,
      );
      expect(await fullRedemptionVault.mToken()).eq(mTBILL.address);
      expect(await fullRedemptionVault.serviceFeeReceiver()).eq(
        serviceFeeReceiver.address,
      );
      expect(await fullRedemptionVault.depositPercentageBps()).eq(
        FRV_TEST_SETTINGS.depositPercentageBps,
      );
      expect(await fullRedemptionVault.serviceFeeAmount()).eq(
        FRV_TEST_SETTINGS.serviceFeeAmount,
      );
      expect(await fullRedemptionVault.claimPeriod()).eq(
        FRV_TEST_SETTINGS.claimPeriod,
      );
      expect(await fullRedemptionVault.rateToleranceBps()).eq(
        FRV_TEST_SETTINGS.rateToleranceBps,
      );
      expect(await fullRedemptionVault.maxRateAdjustmentBps()).eq(
        FRV_TEST_SETTINGS.maxRateAdjustmentBps,
      );
      expect(await fullRedemptionVault.currentRequestId()).eq(0);
      expect(await fullRedemptionVault.greenlistEnabled()).eq(false);
    });

    it('should fail: initialize a second time', async () => {
      const {
        fullRedemptionVault,
        redemptionVault,
        accessControl,
        mockedSanctionsList,
        serviceFeeReceiver,
      } = await loadFixture(fullRedemptionVaultFixture);

      await expect(
        fullRedemptionVault.initialize({
          ac: accessControl.address,
          sanctionsList: mockedSanctionsList.address,
          redemptionVault: redemptionVault.address,
          serviceFeeReceiver: serviceFeeReceiver.address,
          ...FRV_TEST_SETTINGS,
        }),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: initialize the implementation contract', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        mockedSanctionsList,
        serviceFeeReceiver,
        fullRedemptionVault,
      } = await loadFixture(fullRedemptionVaultFixture);

      const implementation = await new FullRedemptionVault__factory(
        owner,
      ).deploy(
        await fullRedemptionVault.contractAdminRole(),
        await fullRedemptionVault.greenlistedRole(),
      );

      await expect(
        implementation.initialize({
          ac: accessControl.address,
          sanctionsList: mockedSanctionsList.address,
          redemptionVault: redemptionVault.address,
          serviceFeeReceiver: serviceFeeReceiver.address,
          ...FRV_TEST_SETTINGS,
        }),
      ).revertedWith('Initializable: contract is already initialized');
    });

    it('should fail: wrong addresses at initialization', async () => {
      const {
        owner,
        redemptionVault,
        accessControl,
        mockedSanctionsList,
        serviceFeeReceiver,
      } = await loadFixture(fullRedemptionVaultFixture);

      const params = {
        ac: accessControl.address,
        sanctionsList: mockedSanctionsList.address,
        redemptionVault: redemptionVault.address,
        serviceFeeReceiver: serviceFeeReceiver.address,
        ...FRV_TEST_SETTINGS,
      };

      const deploy = () => new FullRedemptionVaultTest__factory(owner).deploy();

      let vault = await deploy();
      await expect(
        vault.initialize({ ...params, ac: constants.AddressZero }),
      ).revertedWithCustomError(vault, 'InvalidAddress');

      vault = await deploy();
      await expect(
        vault.initialize({ ...params, redemptionVault: constants.AddressZero }),
      ).revertedWithCustomError(vault, 'InvalidAddress');

      // no receiver is allowed only when the service fee is zero
      vault = await deploy();
      await expect(
        vault.initialize({
          ...params,
          serviceFeeReceiver: constants.AddressZero,
        }),
      ).revertedWithCustomError(vault, 'InvalidAddress');

      vault = await deploy();
      await expect(
        vault.initialize({
          ...params,
          serviceFeeReceiver: constants.AddressZero,
          serviceFeeAmount: 0,
        }),
      ).not.reverted;
    });
  });

  describe('createRequest()', () => {
    it('takes the deposit and the service fee and stores the request', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      // 1,000 mTokens x 5 USD = 5,000 USD. Deposit 2% = 100 USDC. Service fee 4,000 USDC
      const request = await fullRedemptionVault.getRequest(0);
      expect(request.depositLeft).eq(usd(100));
      expect(request.serviceFee).eq(usd(4000));
      expect(request.savedRate).eq(RATE_5);
      expect(request.feePercent).eq(0);
      expect(await stableCoins.usdc.balanceOf(fullRedemptionVault.address)).eq(
        parseUnits('4100', 8),
      );
    });

    it('the deposit asset can differ from the payment token', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.dai,
        stableCoins.usdc6,
        mTokens(1000),
        { from: user },
      );

      const request = await fullRedemptionVault.getRequest(0);
      // dai has a token fee of 1% in the linked RV
      expect(request.feePercent).eq(100);
      expect(await stableCoins.usdc6.balanceOf(fullRedemptionVault.address)).eq(
        parseUnits('4100', 6),
      );
      expect(await stableCoins.dai.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
    });

    it('rounds the deposit down to the decimals of the deposit asset', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      // value 5.0000000005 USD, deposit 2% = 0.10000000001 USD
      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc6,
        stableCoins.usdc6,
        mTokens('1.0000000001'),
        { from: user },
      );

      expect((await fullRedemptionVault.getRequest(0)).depositLeft).eq(
        usd('0.1'),
      );
    });

    it('a wallet with a fee waiver in the RV gets a request with no token fee', async () => {
      const { fullRedemptionVault, redemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await setWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        user.address,
        true,
      );

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.dai,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );

      expect((await fullRedemptionVault.getRequest(0)).feePercent).eq(0);
    });

    it('a wallet can pass the exact amount as the maximum to pay', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user, maxPayAmount: usd(4100) },
      );
    });

    it('should fail: the deposit and the service fee are more than the maximum to pay', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        user,
        mockedAggregatorMToken,
      } = await loadFixture(fullRedemptionVaultFixture);

      // the mToken price went up after the user signed: the deposit is now 102 USDC
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.1);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        {
          from: user,
          maxPayAmount: usd(4100),
          revertCustomError: {
            customErrorName: 'MaxPayAmountExceeded',
            args: [usd(4100), usd(4102)],
          },
        },
      );
    });

    it('should fail: amount is zero', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        0,
        { from: user, revertCustomError: { customErrorName: 'InvalidAmount' } },
      );
    });

    it('should fail: the token fee of the payment token is 100% and the wallet has no fee waiver', async () => {
      const { fullRedemptionVault, redemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      // with this fee nothing can be reserved, so the request could never be processed
      await changeTokenFeeTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc.address,
        10_000,
      );

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        {
          from: user,
          revertCustomError: { customErrorName: 'InvalidFee', args: [10_000] },
        },
      );

      // a wallet with a fee waiver pays no token fee, so it can create the request
      await setWaivedFeeAccountTest(
        { vault: redemptionVault, owner },
        user.address,
        true,
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
    });

    it('should fail: the payment token is not a payment token of the RV', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdt,
        stableCoins.usdc,
        mTokens(1000),
        {
          from: user,
          revertCustomError: {
            customErrorName: 'UnknownPaymentToken',
            args: [stableCoins.usdt.address],
          },
        },
      );
    });

    it('should fail: the payment token is not stable', async () => {
      const { fullRedemptionVault, owner, stableCoins, otherCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        otherCoins.wbtc,
        stableCoins.usdc,
        mTokens(1000),
        {
          from: user,
          revertCustomError: {
            customErrorName: 'PaymentTokenNotStable',
            args: [otherCoins.wbtc.address],
          },
        },
      );
    });

    it('should fail: the deposit asset is not a stable payment token of the RV', async () => {
      const { fullRedemptionVault, owner, stableCoins, otherCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdt,
        mTokens(1000),
        {
          from: user,
          revertCustomError: { customErrorName: 'UnknownPaymentToken' },
        },
      );

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        otherCoins.wbtc,
        mTokens(1000),
        {
          from: user,
          revertCustomError: { customErrorName: 'PaymentTokenNotStable' },
        },
      );
    });

    it('should fail: the deposit asset has lost its peg', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, daiAggregator } =
        await loadFixture(fullRedemptionVaultFixture);

      await setRoundData({ mockedAggregator: daiAggregator }, 0.95);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user, revertMessage: 'DF: feed is unhealthy' },
      );
    });

    it('should fail: the payment token has lost its peg', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, daiAggregator } =
        await loadFixture(fullRedemptionVaultFixture);

      await setRoundData({ mockedAggregator: daiAggregator }, 0.95);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user, revertMessage: 'DF: feed is unhealthy' },
      );
    });

    it('should fail: the wallet did not approve the deposit asset', async () => {
      const { fullRedemptionVault, owner, stableCoins, regularAccounts } =
        await loadFixture(fullRedemptionVaultFixture);

      await mintToken(stableCoins.usdc, regularAccounts[2], 10_000);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        {
          from: regularAccounts[2],
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });

    it('greenlist on, the wallet is on the greenlist', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, accessControl } =
        await loadFixture(fullRedemptionVaultFixture);

      await fullRedemptionVault.setGreenlistEnable(true);
      await greenList(
        { greenlistable: fullRedemptionVault, accessControl, owner },
        user,
      );

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
    });

    it('should fail: greenlist on, the wallet is not on the greenlist', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await fullRedemptionVault.setGreenlistEnable(true);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        {
          from: user,
          revertCustomError: { customErrorName: 'NotGreenlisted' },
        },
      );
    });

    it('should fail: the wallet is on the blacklist', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, accessControl } =
        await loadFixture(fullRedemptionVaultFixture);

      await blackList(
        { blacklistable: fullRedemptionVault, accessControl, owner },
        user,
      );

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user, revertCustomError: acErrors.WMAC_BLACKLISTED },
      );
    });

    it('should fail: the wallet is on the sanctions list', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        user,
        mockedSanctionsList,
      } = await loadFixture(fullRedemptionVaultFixture);

      await sanctionUser({ sanctionsList: mockedSanctionsList }, user);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user, revertCustomError: { customErrorName: 'Sanctioned' } },
      );
    });

    it('should fail: request creation is paused', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, pauseManager } =
        await loadFixture(fullRedemptionVaultFixture);

      await pauseVaultFn(
        { pauseManager, owner },
        fullRedemptionVault,
        CREATE_FN,
      );

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user, revertCustomError: { customErrorName: 'Paused' } },
      );
    });
  });

  describe('processAtCustomRate()', () => {
    it('reserves the liquidity and sets the rate and the deadline', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);

      await processFullRedemptionRequestTest(params, 0, RATE_5);

      // 1,000 mTokens x 5 = 5,000 USDC
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5000));
      expect(
        await fullRedemptionVault.freeLiquidity(stableCoins.usdc.address),
      ).eq(0);
    });

    it('the token fee makes the reserved amount smaller', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      // Midas sends only the amount after the fee: 5,000 - 1% = 4,950
      await mintToken(stableCoins.dai, fullRedemptionVault, 4950);

      await processFullRedemptionRequestTest(params, 0, RATE_5);

      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(4950));
    });

    it('the rate can differ from the rate at creation', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc6,
        stableCoins.usdc6,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc6, fullRedemptionVault, 10_000);

      await processFullRedemptionRequestTest(
        params,
        0,
        parseUnits('5.1234567891'),
      );

      // 5,123.4567891 rounded down to 6 decimals
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(
        usd('5123.456789'),
      );
    });

    it('should fail: the caller is not an admin', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: the function is paused', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, pauseManager } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await pauseVaultFn(
        { pauseManager, owner },
        fullRedemptionVault,
        PROCESS_FN,
      );

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: { customErrorName: 'Paused' },
      });
    });

    it('should fail: the wallet of the request is on the blacklist', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, accessControl } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await blackList(
        { blacklistable: fullRedemptionVault, accessControl, owner },
        user,
      );

      // the wallet cannot claim, so its claim period must not start
      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });
      await safeProcessFullRedemptionRequestsTest(params, [0], 'saved', {
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });

      // a cancel checks neither the wallet nor the refund address
      await cancelFullRedemptionRequestTest(params, 0, user);
    });

    it('should fail: the wallet of the request is on the sanctions list', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        user,
        mockedSanctionsList,
      } = await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await sanctionUser({ sanctionsList: mockedSanctionsList }, user);

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: { customErrorName: 'Sanctioned' },
      });
    });

    it('should fail: greenlist on, the wallet of the request is not on the greenlist', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, accessControl } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await fullRedemptionVault.setGreenlistEnable(true);

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: { customErrorName: 'NotGreenlisted' },
      });

      await greenList(
        { greenlistable: fullRedemptionVault, accessControl, owner },
        user,
      );
      await processFullRedemptionRequestTest(params, 0, RATE_5);
    });

    it('should fail: the request does not exist', async () => {
      const { fullRedemptionVault, owner } = await loadFixture(
        fullRedemptionVaultFixture,
      );

      await processFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        0,
        RATE_5,
        {
          revertCustomError: {
            customErrorName: 'RequestNotExists',
            args: [0],
          },
        },
      );
    });

    it('should fail: the request is already processed', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 10_000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.ReadyToRedeem],
        },
      });
    });

    it('should fail: the rate is zero', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      await processFullRedemptionRequestTest(params, 0, 0, {
        revertCustomError: { customErrorName: 'InvalidNewMTokenRate' },
      });
    });

    it('should fail: free liquidity is one unit less than needed', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await stableCoins.usdc.mint(
        fullRedemptionVault.address,
        parseUnits('5000', 8).sub(1),
      );

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: {
          customErrorName: 'InsufficientFreeLiquidity',
          args: [
            stableCoins.usdc.address,
            usd(5000).sub(parseUnits('1', 10)),
            usd(5000),
          ],
        },
      });

      await stableCoins.usdc.mint(fullRedemptionVault.address, 1);
      await processFullRedemptionRequestTest(params, 0, RATE_5);
    });

    it('should fail: a deposit and a service fee are not free liquidity', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      // FRV now holds 4,010 USDC of deposit and service fee. The request needs 500 USDC
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(100),
        { from: user },
      );

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: {
          customErrorName: 'InsufficientFreeLiquidity',
          args: [stableCoins.usdc.address, 0, usd(500)],
        },
      });
    });

    it('should fail: liquidity reserved for one request cannot be reserved again', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, otherUser } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);

      await processFullRedemptionRequestTest(params, 0, RATE_5);

      await processFullRedemptionRequestTest(params, 1, RATE_5, {
        revertCustomError: {
          customErrorName: 'InsufficientFreeLiquidity',
          args: [stableCoins.usdc.address, 0, usd(5000)],
        },
      });
    });

    it('should fail: the payment token has lost its peg', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, daiAggregator } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.dai, fullRedemptionVault, 5000);
      await setRoundData({ mockedAggregator: daiAggregator }, 0.95);

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertMessage: 'DF: feed is unhealthy',
      });
    });

    it('should fail: the RV removed the payment token', async () => {
      const { fullRedemptionVault, redemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
      );

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: { customErrorName: 'UnknownPaymentToken' },
      });
    });
  });

  describe('claim()', () => {
    // one fixture for the whole file: `loadFixture` cannot switch between two
    const loadProcessedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      // request 0: 1,000 mTokens, 5,000 USDC reserved, deposit 100 USDC, service fee 4,000 USDC
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      return { ...fixture, params };
    };

    it('burns mTokens and pays the share of the liquidity and of the deposit', async () => {
      const { params, user, fullRedemptionVault } =
        await loadProcessedRequest();

      const result = await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
      });

      // a quarter of the request: 1,250 USDC and 25 USDC of the deposit
      expect(result?.payout).eq(usd(1250));
      expect(result?.depositShare).eq(usd(25));
      expect((await fullRedemptionVault.getRequest(0)).status).eq(
        FrvStatus.PartiallyRedeemed,
      );
    });

    it('claim 25,000 of 400,000 mTokens at rate 1.00: pays 25,000 USDC and returns 500 USDC of the 8,000 USDC deposit', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        user,
        mockedAggregatorMToken,
      } = await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(400_000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 400_000);
      await processFullRedemptionRequestTest(params, 0, parseUnits('1'));

      const request = await fullRedemptionVault.getRequest(0);
      expect(request.reserved).eq(usd(400_000));
      expect(request.depositLeft).eq(usd(8000));

      const result = await claimFullRedemptionTest(params, 0, mTokens(25_000), {
        from: user,
      });

      expect(result?.payout).eq(usd(25_000));
      expect(result?.depositShare).eq(usd(500));
    });

    it('one claim for the full amount completes the request', async () => {
      const { params, user, fullRedemptionVault, stableCoins } =
        await loadProcessedRequest();

      const result = await claimFullRedemptionTest(params, 0, mTokens(1000), {
        from: user,
      });

      expect(result?.payout).eq(usd(5000));
      expect(result?.depositShare).eq(usd(100));
      expect((await fullRedemptionVault.getRequest(0)).status).eq(
        FrvStatus.Completed,
      );
      expect(await stableCoins.usdc.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
    });

    it('many claims with rounding pay exactly the reserved amount and the deposit, with no dust', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc6,
        stableCoins.dai,
        mTokens('1000.123456789123456789'),
        { from: user },
      );
      await mintToken(stableCoins.usdc6, fullRedemptionVault, 10_000);
      await processFullRedemptionRequestTest(
        params,
        0,
        parseUnits('5.033333333333333333'),
      );

      const { reserved, depositLeft } = await fullRedemptionVault.getRequest(0);
      let paid = constants.Zero;
      let depositReturned = constants.Zero;

      for (const amount of [
        mTokens('333.333333333333333333'),
        mTokens('0.000001'),
        mTokens('123.456789'),
        mTokens('500.000000000000000007'),
      ]) {
        const result = await claimFullRedemptionTest(params, 0, amount, {
          from: user,
        });
        paid = paid.add(result?.payout ?? 0);
        depositReturned = depositReturned.add(result?.depositShare ?? 0);
      }

      const { remaining } = await fullRedemptionVault.getRequest(0);
      const last = await claimFullRedemptionTest(params, 0, remaining, {
        from: user,
      });

      expect(paid.add(last?.payout ?? 0)).eq(reserved);
      expect(depositReturned.add(last?.depositShare ?? 0)).eq(depositLeft);
      expect(await stableCoins.dai.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
    });

    it('a claim after the deadline works and returns the deposit share', async () => {
      const { params, user } = await loadProcessedRequest();

      await increase(days(31));

      const result = await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
      });

      expect(result?.depositShare).eq(usd(25));
    });

    it('a claim reads nothing from the RV: it works after the RV removed the payment token and the price feeds became unhealthy', async () => {
      const {
        params,
        user,
        redemptionVault,
        owner,
        stableCoins,
        dataFeed,
        mTokenToUsdDataFeed,
        mockedAggregator,
        mockedAggregatorMToken,
      } = await loadProcessedRequest();

      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
      );

      // the price of the payment token and the price of the mToken leave their ranges
      await setRoundData({ mockedAggregator }, 0.01);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0.01);

      await expect(dataFeed.getDataInBase18()).revertedWith(
        'DF: feed is unhealthy',
      );
      await expect(mTokenToUsdDataFeed.getDataInBase18()).revertedWith(
        'DF: feed is unhealthy',
      );

      await claimFullRedemptionTest(params, 0, mTokens(1000), { from: user });
    });

    it('the claim pays at least the minimum the wallet gave', async () => {
      const { params, user } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        minReceiveAmount: usd(1250),
      });
    });

    it('should fail: the payout is less than the minimum', async () => {
      const { params, user } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        minReceiveAmount: usd(1250).add(1),
        revertCustomError: {
          customErrorName: 'SlippageExceeded',
          args: [usd(1250).add(1), usd(1250)],
        },
      });
    });

    it('should fail: the caller is not the wallet of the request', async () => {
      const { params, otherUser, owner } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: otherUser,
        revertCustomError: {
          customErrorName: 'NotRequestWallet',
          args: [0, otherUser.address],
        },
      });

      // an admin cannot claim either
      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: owner,
        revertCustomError: { customErrorName: 'NotRequestWallet' },
      });
    });

    it('should fail: no payout without the burn', async () => {
      const { params, user, mTBILL, otherUser } = await loadProcessedRequest();

      // the wallet keeps less mTokens than it claims
      await mTBILL
        .connect(user)
        .transfer(
          otherUser.address,
          (await mTBILL.balanceOf(user.address)).sub(mTokens(249)),
        );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('should fail: the claim is larger than the remaining amount', async () => {
      const { params, user } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(400), { from: user });

      await claimFullRedemptionTest(params, 0, mTokens(600).add(1), {
        from: user,
        revertCustomError: {
          customErrorName: 'AmountExceedsRemaining',
          args: [mTokens(600).add(1), mTokens(600)],
        },
      });
    });

    it('should fail: amount is zero', async () => {
      const { params, user } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, 0, {
        from: user,
        revertCustomError: { customErrorName: 'InvalidAmount' },
      });
    });

    it('should fail: the claim is so small that the payout rounds down to zero', async () => {
      const { params, user } = await loadProcessedRequest();

      // 0.000000001 mTokens x 5 = 0.000000005 USDC: less than one unit of a token with 8 decimals
      await claimFullRedemptionTest(params, 0, mTokens('0.000000001'), {
        from: user,
        revertCustomError: { customErrorName: 'InvalidAmount' },
      });

      // 0.000000002 mTokens x 5 = 0.00000001 USDC: exactly one unit
      await claimFullRedemptionTest(params, 0, mTokens('0.000000002'), {
        from: user,
      });
    });

    it('should fail: the request does not exist', async () => {
      const { params, user } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 1, mTokens(250), {
        from: user,
        revertCustomError: { customErrorName: 'RequestNotExists', args: [1] },
      });
    });

    it('should fail: the request is not processed', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.Submitted],
        },
      });
    });

    it('should fail: the wallet is on the blacklist', async () => {
      const { params, user, fullRedemptionVault, accessControl, owner } =
        await loadProcessedRequest();

      await blackList(
        { blacklistable: fullRedemptionVault, accessControl, owner },
        user,
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });
    });

    it('should fail: the wallet is on the sanctions list', async () => {
      const { params, user, mockedSanctionsList } =
        await loadProcessedRequest();

      await sanctionUser({ sanctionsList: mockedSanctionsList }, user);

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError: { customErrorName: 'Sanctioned' },
      });
    });

    it('should fail: greenlist on, the wallet is not on the greenlist', async () => {
      const { params, user, fullRedemptionVault } =
        await loadProcessedRequest();

      await fullRedemptionVault.setGreenlistEnable(true);

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError: { customErrorName: 'NotGreenlisted' },
      });
    });

    it('should fail: claims are paused', async () => {
      const { params, user, fullRedemptionVault, pauseManager, owner } =
        await loadProcessedRequest();

      await pauseVaultFn(
        { pauseManager, owner },
        fullRedemptionVault,
        CLAIM_FN,
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError: { customErrorName: 'Paused' },
      });
    });
  });

  describe('reallocate()', () => {
    // one fixture for the whole file: `loadFixture` cannot switch between two
    const loadProcessedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      // request 0: 1,000 mTokens, 4,950 DAI reserved, deposit 100 USDC, service fee 4,000 USDC
      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.dai, fullRedemptionVault, 4950);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      return { ...fixture, params };
    };

    it('after the deadline, sends the liquidity and the deposit to the tokens receiver and the service fee to its receiver', async () => {
      const {
        params,
        stableCoins,
        tokensReceiver,
        serviceFeeReceiver,
        fullRedemptionVault,
      } = await loadProcessedRequest();

      await increase(days(30) + 1);
      await reallocateFullRedemptionTest(params, 0);

      expect(await stableCoins.dai.balanceOf(tokensReceiver.address)).eq(
        parseUnits('4950', 9),
      );
      expect(await stableCoins.usdc.balanceOf(tokensReceiver.address)).eq(
        parseUnits('100', 8),
      );
      expect(await stableCoins.usdc.balanceOf(serviceFeeReceiver.address)).eq(
        parseUnits('4000', 8),
      );
      expect(await stableCoins.dai.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
      expect(await stableCoins.usdc.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
    });

    it('after a partial claim, takes only what is left', async () => {
      const { params, user, stableCoins, tokensReceiver } =
        await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(400), { from: user });
      await increase(days(31));
      await reallocateFullRedemptionTest(params, 0);

      // 60% is left: 2,970 DAI and 60 USDC of the deposit
      expect(await stableCoins.dai.balanceOf(tokensReceiver.address)).eq(
        parseUnits('2970', 9),
      );
      expect(await stableCoins.usdc.balanceOf(tokensReceiver.address)).eq(
        parseUnits('60', 8),
      );
    });

    it('uses the tokens receiver that the RV has at the time of the call', async () => {
      const { params, redemptionVault, owner, regularAccounts, stableCoins } =
        await loadProcessedRequest();

      await setTokensReceiverTest(
        { vault: redemptionVault, owner },
        regularAccounts[3].address,
      );
      await increase(days(31));
      await reallocateFullRedemptionTest(params, 0);

      expect(await stableCoins.dai.balanceOf(regularAccounts[3].address)).eq(
        parseUnits('4950', 9),
      );
    });

    it('should fail: the deadline has not passed', async () => {
      const { params, fullRedemptionVault } = await loadProcessedRequest();

      const { deadline } = await fullRedemptionVault.getRequest(0);

      const revertCustomError = {
        customErrorName: 'DeadlineNotPassed',
        args: [0, deadline],
      };

      await increase(days(29));
      await reallocateFullRedemptionTest(params, 0, { revertCustomError });

      // in the second of the deadline itself Midas cannot reallocate yet
      await setNextBlockTimestamp(deadline);
      await reallocateFullRedemptionTest(params, 0, { revertCustomError });

      await setNextBlockTimestamp(deadline.add(1));
      await reallocateFullRedemptionTest(params, 0);
    });

    it('should fail: the caller is not an admin', async () => {
      const { params, user } = await loadProcessedRequest();

      await increase(days(31));

      await reallocateFullRedemptionTest(params, 0, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: the request does not exist', async () => {
      const { params } = await loadProcessedRequest();

      await reallocateFullRedemptionTest(params, 1, {
        revertCustomError: { customErrorName: 'RequestNotExists', args: [1] },
      });
    });

    it('should fail: the request is not processed', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await increase(days(31));

      await reallocateFullRedemptionTest(params, 0, {
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.Submitted],
        },
      });
    });
  });

  describe('withdrawToken()', () => {
    it('sends free liquidity to the tokens receiver of the RV', async () => {
      const { fullRedemptionVault, owner, stableCoins } = await loadFixture(
        fullRedemptionVaultFixture,
      );

      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);

      await withdrawFullRedemptionTokenTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        parseUnits('5000', 8),
      );
    });

    it('should fail: an admin cannot withdraw reserved liquidity, a deposit or a service fee', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      // FRV holds 4,100 USDC of deposit and service fee, and no free liquidity
      await withdrawFullRedemptionTokenTest(params, stableCoins.usdc, 1, {
        revertCustomError: {
          customErrorName: 'InsufficientFreeLiquidity',
          args: [stableCoins.usdc.address, 0, parseUnits('1', 10)],
        },
      });

      // Midas sends 5,000 USDC for the request and 7 USDC too much
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5007);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      await withdrawFullRedemptionTokenTest(
        params,
        stableCoins.usdc,
        parseUnits('7', 8).add(1),
        {
          revertCustomError: { customErrorName: 'InsufficientFreeLiquidity' },
        },
      );

      await withdrawFullRedemptionTokenTest(
        params,
        stableCoins.usdc,
        parseUnits('7', 8),
      );

      expect(await stableCoins.usdc.balanceOf(fullRedemptionVault.address)).eq(
        parseUnits('9100', 8),
      );
    });

    it('should fail: the caller is not an admin', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);

      await withdrawFullRedemptionTokenTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        1,
        { from: user, revertCustomError: acErrors.WMAC_HASNT_PERMISSION },
      );
    });
  });

  describe('invariants over the life of several requests', () => {
    it('the balance covers what requests hold, and `held` is the sum over the requests', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, otherUser } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      // each helper checks the invariants after its transaction
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens('777.777'),
        { from: otherUser },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(2500),
        { from: user },
      );

      await mintToken(stableCoins.usdc, fullRedemptionVault, 20_000);
      await mintToken(stableCoins.dai, fullRedemptionVault, 20_000);

      await processFullRedemptionRequestTest(params, 0, RATE_5);
      await processFullRedemptionRequestTest(params, 2, parseUnits('5.01'));
      await claimFullRedemptionTest(params, 0, mTokens(300), { from: user });
      await processFullRedemptionRequestTest(params, 1, parseUnits('4.99'));
      await claimFullRedemptionTest(params, 1, mTokens('777.777'), {
        from: otherUser,
      });
      await claimFullRedemptionTest(params, 2, mTokens('0.5'), { from: user });

      await increase(days(31));

      await reallocateFullRedemptionTest(params, 2);
      await claimFullRedemptionTest(params, 0, mTokens(700), { from: user });

      // all three requests are final: nothing is held, the rest is free liquidity
      for (const token of [stableCoins.usdc, stableCoins.dai]) {
        expect(await fullRedemptionVault.held(token.address)).eq(0);
      }
    });

    it('two requests in one token: each wallet gets only the liquidity of its own request', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, otherUser } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(2000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 15_000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);
      await processFullRedemptionRequestTest(params, 1, RATE_5);

      const first = await claimFullRedemptionTest(params, 0, mTokens(1000), {
        from: user,
      });
      expect(first?.payout).eq(usd(5000));

      // request 0 is paid in full. Request 1 still has all of its liquidity
      expect((await fullRedemptionVault.getRequest(1)).reserved).eq(
        usd(10_000),
      );

      const second = await claimFullRedemptionTest(params, 1, mTokens(2000), {
        from: otherUser,
      });
      expect(second?.payout).eq(usd(10_000));
    });

    it('a final request accepts no call', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, otherUser } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 20_000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);
      await processFullRedemptionRequestTest(params, 1, RATE_5);

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await cancelFullRedemptionRequestTest(params, 2, user);

      await claimFullRedemptionTest(params, 0, mTokens(1000), { from: user });
      await increase(days(31));
      await reallocateFullRedemptionTest(params, 1);

      const cases = [
        { id: 0, wallet: user, status: FrvStatus.Completed },
        { id: 1, wallet: otherUser, status: FrvStatus.Reallocated },
        { id: 2, wallet: user, status: FrvStatus.Cancelled },
      ];

      for (const { id, wallet, status } of cases) {
        const revertCustomError = {
          customErrorName: 'InvalidRequestStatus',
          args: [id, status],
        };

        await claimFullRedemptionTest(params, id, 1, {
          from: wallet,
          revertCustomError,
        });
        await claimFullRedemptionTest(params, id, 1, {
          from: wallet,
          recipient: owner,
          revertCustomError,
        });
        await processFullRedemptionRequestTest(params, id, RATE_5, {
          revertCustomError,
        });
        await safeProcessFullRedemptionRequestsTest(params, [id], 'saved', {
          revertCustomError,
        });
        await safeProcessFullRedemptionRequestsTest(params, [id], [RATE_5], {
          revertCustomError,
        });
        await adjustFullRedemptionRateTest(params, id, RATE_5, {
          revertCustomError,
        });
        await reallocateFullRedemptionTest(params, id, { revertCustomError });
        await cancelFullRedemptionRequestTest(params, id, wallet, {
          revertCustomError,
        });
        await pauseFullRedemptionRequestTest(params, id, {
          revertCustomError,
        });

        expect((await fullRedemptionVault.getRequest(id)).status).eq(status);
      }
    });

    it('the balance covers what requests hold, with a deposit in mTokens, a rate change, a cancel and a pause', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        mTBILL,
        user,
        otherUser,
        customRecipient,
      } = await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      // each helper checks the invariants after its transaction
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: user },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(500),
        { from: otherUser },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens('2000.5'),
        { from: otherUser },
      );

      await mintToken(stableCoins.usdc, fullRedemptionVault, 6000);
      await mintToken(stableCoins.dai, fullRedemptionVault, 3000);

      await safeProcessFullRedemptionRequestsTest(params, [0, 1], 'saved');
      await cancelFullRedemptionRequestTest(params, 2, otherUser);

      await claimFullRedemptionTest(params, 0, mTokens(300), { from: user });
      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.04'));
      await claimFullRedemptionTest(params, 1, mTokens(500), {
        from: otherUser,
        recipient: customRecipient,
      });
      await claimFullRedemptionTest(params, 0, mTokens('0.5'), { from: user });
      await adjustFullRedemptionRateTest(params, 0, parseUnits('4.96'));

      await pauseFullRedemptionRequestTest(params, 0);
      await reallocateFullRedemptionTest(params, 0);

      // all three requests are final: nothing is held
      for (const token of [stableCoins.usdc, stableCoins.dai, mTBILL]) {
        expect(await fullRedemptionVault.held(token.address)).eq(0);
      }
    });
  });

  describe('createRequest() with a deposit in mTokens', () => {
    it('the deposit is a share of the requested mTokens, the service fee is converted at the mToken rate', async () => {
      const { fullRedemptionVault, owner, stableCoins, mTBILL, user } =
        await loadFixture(fullRedemptionVaultFixture);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: user },
      );

      // deposit: 2% of 1,000 mTokens. Service fee: 4,000 USD / 5 USD
      const request = await fullRedemptionVault.getRequest(0);
      expect(request.depositLeft).eq(mTokens(20));
      expect(request.serviceFee).eq(mTokens(800));
      expect(await mTBILL.balanceOf(fullRedemptionVault.address)).eq(
        mTokens(820),
      );
    });

    it('should fail: the mToken price went down, the service fee in mTokens is more than the maximum to pay', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        mTBILL,
        user,
        mockedAggregatorMToken,
      } = await loadFixture(fullRedemptionVaultFixture);

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 4.9);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        {
          from: user,
          maxPayAmount: mTokens(820),
          revertCustomError: {
            customErrorName: 'MaxPayAmountExceeded',
            args: [
              mTokens(820),
              mTokens(20).add(
                usd(4000).mul(parseUnits('1')).div(parseUnits('4.9')),
              ),
            ],
          },
        },
      );
    });

    it('should fail: the wallet did not approve mTokens', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        mTBILL,
        regularAccounts,
      } = await loadFixture(fullRedemptionVaultFixture);

      await mintToken(mTBILL, regularAccounts[2], 10_000);

      await createFullRedemptionRequestTest(
        { fullRedemptionVault, owner },
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        {
          from: regularAccounts[2],
          revertMessage: 'ERC20: insufficient allowance',
        },
      );
    });
  });

  describe('safe process functions', () => {
    // requests 0 and 1: 1,000 mTokens each, paid in USDC. FRV has 20,000 USDC of free liquidity
    const loadTwoRequests = async (secondSavedRate = 5) => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        user,
        otherUser,
        mockedAggregatorMToken,
      } = fixture;
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await setRoundData(
        { mockedAggregator: mockedAggregatorMToken },
        secondSavedRate,
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 20_000);

      return { ...fixture, params };
    };

    it('safeProcessAtSavedRateBulk uses the rate of each request at its creation', async () => {
      const { params, fullRedemptionVault, mockedAggregatorMToken } =
        await loadTwoRequests(5.1);

      // the price now does not matter
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 7);

      await safeProcessFullRedemptionRequestsTest(params, [0, 1], 'saved');

      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5000));
      expect((await fullRedemptionVault.getRequest(1)).reserved).eq(usd(5100));
    });

    it('safeProcessAtCurrentRateBulk uses the rate of the data feed', async () => {
      const { params, fullRedemptionVault, mockedAggregatorMToken } =
        await loadTwoRequests();

      // 4% more than the saved rate. The tolerance of the tests is 5%
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.2);

      await safeProcessFullRedemptionRequestsTest(params, [0, 1], 'current');

      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5200));
      expect((await fullRedemptionVault.getRequest(1)).reserved).eq(usd(5200));
    });

    it('safeProcessAtCustomRateBulk uses one rate for each request', async () => {
      const { params, fullRedemptionVault } = await loadTwoRequests();

      // 5% less and 5% more than the saved rate: the edge of the tolerance
      await safeProcessFullRedemptionRequestsTest(
        params,
        [1, 0],
        [parseUnits('4.75'), parseUnits('5.25')],
      );

      expect((await fullRedemptionVault.getRequest(1)).reserved).eq(usd(4750));
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5250));
    });

    it('processAtCustomRate has no tolerance check', async () => {
      const { params, fullRedemptionVault } = await loadTwoRequests();

      await processFullRedemptionRequestTest(params, 0, parseUnits('10'));

      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(
        usd(10_000),
      );
    });

    it('a request with a deposit in mTokens reserves payment tokens for the deposit too', async () => {
      const { fullRedemptionVault, owner, stableCoins, mTBILL, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5100);

      await safeProcessFullRedemptionRequestsTest(params, [0], 'saved');

      // (1,000 requested + 20 of deposit) x 5
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5100));
      expect(
        await fullRedemptionVault.freeLiquidity(stableCoins.usdc.address),
      ).eq(0);
    });

    it('should fail: a custom rate is outside the tolerance', async () => {
      const { params } = await loadTwoRequests();

      await safeProcessFullRedemptionRequestsTest(
        params,
        [0, 1],
        [RATE_5, parseUnits('5.26')],
        {
          revertCustomError: {
            customErrorName: 'PriceVariationExceeded',
            args: [520, 500],
          },
        },
      );
      await safeProcessFullRedemptionRequestsTest(
        params,
        [0],
        [parseUnits('4.7')],
        {
          revertCustomError: {
            customErrorName: 'PriceVariationExceeded',
            args: [600, 500],
          },
        },
      );
    });

    it('should fail: the current rate is outside the tolerance', async () => {
      const { params, mockedAggregatorMToken } = await loadTwoRequests();

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 5.3);

      await safeProcessFullRedemptionRequestsTest(params, [0, 1], 'current', {
        revertCustomError: {
          customErrorName: 'PriceVariationExceeded',
          args: [600, 500],
        },
      });
    });

    it('should fail: one request of the list has no liquidity, so no request is processed', async () => {
      const { params, fullRedemptionVault, stableCoins } =
        await loadTwoRequests();

      // 5,000 USDC stay: enough for one request, not for two
      await withdrawFullRedemptionTokenTest(
        params,
        stableCoins.usdc,
        parseUnits('15000', 8),
      );

      await safeProcessFullRedemptionRequestsTest(params, [0, 1], 'saved', {
        revertCustomError: {
          customErrorName: 'InsufficientFreeLiquidity',
          args: [stableCoins.usdc.address, 0, usd(5000)],
        },
      });

      expect((await fullRedemptionVault.getRequest(0)).status).eq(
        FrvStatus.Submitted,
      );
      expect((await fullRedemptionVault.getRequest(1)).status).eq(
        FrvStatus.Submitted,
      );
    });

    it('should fail: the same request two times in one list', async () => {
      const { params } = await loadTwoRequests();

      await safeProcessFullRedemptionRequestsTest(params, [0, 0], 'saved', {
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.ReadyToRedeem],
        },
      });
    });

    it('should fail: a request of the list does not exist', async () => {
      const { params } = await loadTwoRequests();

      for (const mode of ['saved', 'current'] as const) {
        await safeProcessFullRedemptionRequestsTest(params, [0, 2], mode, {
          revertCustomError: {
            customErrorName: 'RequestNotExists',
            args: [2],
          },
        });
      }
    });

    it('should fail: the lists of ids and rates have different lengths', async () => {
      const { params } = await loadTwoRequests();

      await safeProcessFullRedemptionRequestsTest(params, [0, 1], [RATE_5], {
        revertCustomError: {
          customErrorName: 'MismatchArrays',
          args: [2, 1],
        },
      });
    });

    it('should fail: a rate is zero', async () => {
      const { params } = await loadTwoRequests();

      await safeProcessFullRedemptionRequestsTest(params, [0], [0], {
        revertCustomError: { customErrorName: 'InvalidNewMTokenRate' },
      });
    });

    it('should fail: the caller is not an admin', async () => {
      const { params, user } = await loadTwoRequests();

      await safeProcessFullRedemptionRequestsTest(params, [0], 'saved', {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
      await safeProcessFullRedemptionRequestsTest(params, [0], 'current', {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
      await safeProcessFullRedemptionRequestsTest(params, [0], [RATE_5], {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: the function is paused', async () => {
      const { params, fullRedemptionVault, pauseManager, owner } =
        await loadTwoRequests();

      await pauseVaultFn({ pauseManager, owner }, fullRedemptionVault, [
        encodeFnSelector('safeProcessAtSavedRateBulk(uint256[])'),
        encodeFnSelector('safeProcessAtCurrentRateBulk(uint256[])'),
        encodeFnSelector('safeProcessAtCustomRateBulk(uint256[],uint256[])'),
      ]);

      for (const mode of ['saved', 'current'] as const) {
        await safeProcessFullRedemptionRequestsTest(params, [0], mode, {
          revertCustomError: { customErrorName: 'Paused' },
        });
      }
      await safeProcessFullRedemptionRequestsTest(params, [0], [RATE_5], {
        revertCustomError: { customErrorName: 'Paused' },
      });

      // the function for one request is not paused
      await processFullRedemptionRequestTest(params, 0, RATE_5);
    });
  });

  describe('claim() with a deposit in mTokens', () => {
    it('requested 1,000,000, deposit 20,000 mTokens, rate 1.00: a claim of 500,000 pays 510,000 USDC and burns 10,000 mTokens of the deposit', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        mTBILL,
        user,
        serviceFeeReceiver,
        mockedAggregatorMToken,
      } = await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      // the wallet needs the deposit and the service fee on top of the 1,000,000 it redeems
      await mintToken(mTBILL, user, 24_000);
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1_000_000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 1_020_000);
      await processFullRedemptionRequestTest(params, 0, parseUnits('1'));

      const request = await fullRedemptionVault.getRequest(0);
      expect(request.depositLeft).eq(mTokens(20_000));
      expect(request.reserved).eq(usd(1_020_000));

      // FRV burns 500,000 mTokens of the wallet and 10,000 mTokens of the deposit
      const first = await claimFullRedemptionTest(params, 0, mTokens(500_000), {
        from: user,
      });
      expect(first?.payout).eq(usd(510_000));
      expect(first?.depositShare).eq(mTokens(10_000));

      const last = await claimFullRedemptionTest(params, 0, mTokens(500_000), {
        from: user,
      });
      expect(last?.payout).eq(usd(510_000));

      // the wallet got all of its position in USDC and no mTokens back
      expect(await mTBILL.balanceOf(user.address)).eq(0);
      // the service fee: 4,000 USD at rate 1.00, in mTokens
      expect(await mTBILL.balanceOf(serviceFeeReceiver.address)).eq(
        mTokens(4000),
      );
      expect(await mTBILL.balanceOf(fullRedemptionVault.address)).eq(0);
      expect(await stableCoins.usdc.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
    });

    it('the token fee applies to the deposit share too', async () => {
      const { fullRedemptionVault, owner, stableCoins, mTBILL, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        mTBILL,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.dai, fullRedemptionVault, 5049);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      // (1,000 + 20) x 5 = 5,100, minus the token fee of 1%
      const result = await claimFullRedemptionTest(params, 0, mTokens(1000), {
        from: user,
      });
      expect(result?.payout).eq(usd(5049));
    });

    it('reallocation sends the remaining deposit in mTokens to the tokens receiver and does not burn it', async () => {
      const {
        fullRedemptionVault,
        owner,
        stableCoins,
        mTBILL,
        user,
        tokensReceiver,
        serviceFeeReceiver,
      } = await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5100);
      await processFullRedemptionRequestTest(params, 0, RATE_5);
      await claimFullRedemptionTest(params, 0, mTokens(400), { from: user });

      const supplyBefore = await mTBILL.totalSupply();

      await increase(days(31));
      await reallocateFullRedemptionTest(params, 0);

      expect(await mTBILL.totalSupply()).eq(supplyBefore);
      // 60% is left: 12 mTokens of deposit and 3,060 USDC
      expect(await mTBILL.balanceOf(tokensReceiver.address)).eq(mTokens(12));
      expect(await stableCoins.usdc.balanceOf(tokensReceiver.address)).eq(
        parseUnits('3060', 8),
      );
      expect(await mTBILL.balanceOf(serviceFeeReceiver.address)).eq(
        mTokens(800),
      );
    });
  });

  describe('claim() to a recipient', () => {
    const CLAIM_TO_RECIPIENT_FN = encodeFnSelector(
      'claim(uint256,uint256,uint256,address)',
    );

    // request 0 of `user`: 1,000 mTokens, 5,000 USDC reserved, deposit 100 DAI, service fee 4,000 DAI
    const loadProcessedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      return { ...fixture, params };
    };

    it('the wallet burns its mTokens, the recipient gets the payout and the deposit share', async () => {
      const { params, user, customRecipient, regularAccounts, stableCoins } =
        await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: customRecipient,
      });

      expect(await stableCoins.usdc.balanceOf(customRecipient.address)).eq(
        parseUnits('1250', 8),
      );
      expect(await stableCoins.dai.balanceOf(customRecipient.address)).eq(
        parseUnits('25', 9),
      );

      // the recipient is a parameter of each call: the next claim can name another one
      await claimFullRedemptionTest(params, 0, mTokens(750), {
        from: user,
        recipient: regularAccounts[3],
      });
    });

    it('should fail: the recipient cannot claim', async () => {
      const { params, customRecipient } = await loadProcessedRequest();

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: customRecipient,
        recipient: customRecipient,
        revertCustomError: { customErrorName: 'NotRequestWallet' },
      });
    });

    it('should fail: the recipient is on the blacklist', async () => {
      const {
        params,
        user,
        customRecipient,
        fullRedemptionVault,
        accessControl,
        owner,
      } = await loadProcessedRequest();

      await blackList(
        { blacklistable: fullRedemptionVault, accessControl, owner },
        customRecipient,
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: customRecipient,
        revertCustomError: acErrors.WMAC_BLACKLISTED,
      });
    });

    it('should fail: the recipient is on the sanctions list', async () => {
      const { params, user, customRecipient, mockedSanctionsList } =
        await loadProcessedRequest();

      await sanctionUser(
        { sanctionsList: mockedSanctionsList },
        customRecipient,
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: customRecipient,
        revertCustomError: { customErrorName: 'Sanctioned' },
      });
    });

    it('should fail: greenlist on, the recipient is not on the greenlist', async () => {
      const {
        params,
        user,
        customRecipient,
        fullRedemptionVault,
        accessControl,
        owner,
      } = await loadProcessedRequest();

      await fullRedemptionVault.setGreenlistEnable(true);
      await greenList(
        { greenlistable: fullRedemptionVault, accessControl, owner },
        user,
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: customRecipient,
        revertCustomError: { customErrorName: 'NotGreenlisted' },
      });

      await greenList(
        { greenlistable: fullRedemptionVault, accessControl, owner },
        customRecipient,
      );
      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: customRecipient,
      });
    });

    it('should fail: the recipient is the zero address', async () => {
      const { params, user, fullRedemptionVault } =
        await loadProcessedRequest();

      await expect(
        fullRedemptionVault
          .connect(user)
          ['claim(uint256,uint256,uint256,address)'](
            0,
            mTokens(250),
            0,
            constants.AddressZero,
          ),
      ).revertedWithCustomError(fullRedemptionVault, 'InvalidAddress');

      // the helper with no recipient calls the function with three parameters
      await claimFullRedemptionTest(params, 0, mTokens(250), { from: user });
    });

    it('should fail: claims to a recipient are paused', async () => {
      const {
        params,
        user,
        customRecipient,
        fullRedemptionVault,
        owner,
        pauseManager,
      } = await loadProcessedRequest();

      await pauseVaultFn(
        { pauseManager, owner },
        fullRedemptionVault,
        CLAIM_TO_RECIPIENT_FN,
      );

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: customRecipient,
        revertCustomError: { customErrorName: 'Paused' },
      });
    });
  });

  describe('adjustRate()', () => {
    // request 0 of `user`: 1,000 mTokens, processed at 5.00, 5,000 USDC reserved.
    // The largest rate change of the tests is 1% of the rate set at processing
    const loadProcessedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      return { ...fixture, params };
    };

    it('a higher rate reserves the difference from free liquidity', async () => {
      const { params, fullRedemptionVault, stableCoins } =
        await loadProcessedRequest();

      await mintToken(stableCoins.usdc, fullRedemptionVault, 50);
      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.05'));

      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5050));
      expect(
        await fullRedemptionVault.freeLiquidity(stableCoins.usdc.address),
      ).eq(0);
    });

    it('a lower rate makes the difference free liquidity', async () => {
      const { params, fullRedemptionVault, stableCoins } =
        await loadProcessedRequest();

      await adjustFullRedemptionRateTest(params, 0, parseUnits('4.95'));

      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(4950));
      await withdrawFullRedemptionTokenTest(
        params,
        stableCoins.usdc,
        parseUnits('50', 8),
      );
    });

    it('the new rate applies only to what is not claimed yet', async () => {
      const { params, fullRedemptionVault, stableCoins, user } =
        await loadProcessedRequest();

      const first = await claimFullRedemptionTest(params, 0, mTokens(400), {
        from: user,
      });
      expect(first?.payout).eq(usd(2000));

      await mintToken(stableCoins.usdc, fullRedemptionVault, 30);
      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.05'));

      // 600 mTokens are left: 600 x 5.05
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(3030));

      const last = await claimFullRedemptionTest(params, 0, mTokens(600), {
        from: user,
      });
      expect(last?.payout).eq(usd(3030));
    });

    it('with a deposit in mTokens the new rate applies to the deposit that is left too', async () => {
      const { fullRedemptionVault, owner, stableCoins, mTBILL, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5151);
      await processFullRedemptionRequestTest(params, 0, RATE_5);
      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.05'));

      // (1,000 + 20) x 5.05
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5151));
    });

    it('the limit is measured from the rate set at processing, so small changes cannot add up', async () => {
      const { params, fullRedemptionVault, stableCoins } =
        await loadProcessedRequest();

      await mintToken(stableCoins.usdc, fullRedemptionVault, 1000);

      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.05'));

      // 1% more than the rate now, but 2.01% more than the rate set at processing
      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.1005'), {
        revertCustomError: {
          customErrorName: 'PriceVariationExceeded',
          args: [201, 100],
        },
      });

      // 2% less than the rate now, 1% less than the rate set at processing
      await adjustFullRedemptionRateTest(params, 0, parseUnits('4.95'));
    });

    it('should fail: the change is larger than maxRateAdjustmentBps', async () => {
      const { params, fullRedemptionVault, stableCoins } =
        await loadProcessedRequest();

      await mintToken(stableCoins.usdc, fullRedemptionVault, 1000);

      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.06'), {
        revertCustomError: {
          customErrorName: 'PriceVariationExceeded',
          args: [120, 100],
        },
      });
      await adjustFullRedemptionRateTest(params, 0, parseUnits('4.94'), {
        revertCustomError: {
          customErrorName: 'PriceVariationExceeded',
          args: [120, 100],
        },
      });
    });

    it('should fail: free liquidity does not cover a higher rate', async () => {
      const { params, stableCoins } = await loadProcessedRequest();

      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.05'), {
        revertCustomError: {
          customErrorName: 'InsufficientFreeLiquidity',
          args: [stableCoins.usdc.address, 0, usd(50)],
        },
      });
    });

    it('should fail: the payment token has lost its peg', async () => {
      const { fullRedemptionVault, owner, stableCoins, user, daiAggregator } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.dai, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);
      await setRoundData({ mockedAggregator: daiAggregator }, 0.95);

      await adjustFullRedemptionRateTest(params, 0, parseUnits('4.95'), {
        revertMessage: 'DF: feed is unhealthy',
      });
    });

    it('should fail: the request is not processed', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      await adjustFullRedemptionRateTest(params, 0, RATE_5, {
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.Submitted],
        },
      });
    });

    it('should fail: the request does not exist, the rate is zero, the caller is not an admin', async () => {
      const { params, user } = await loadProcessedRequest();

      await adjustFullRedemptionRateTest(params, 1, RATE_5, {
        revertCustomError: { customErrorName: 'RequestNotExists', args: [1] },
      });
      await adjustFullRedemptionRateTest(params, 0, 0, {
        revertCustomError: { customErrorName: 'InvalidNewMTokenRate' },
      });
      await adjustFullRedemptionRateTest(params, 0, RATE_5, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });
  });

  describe('cancelRequest()', () => {
    // request 0 of `user`: 1,000 mTokens, deposit 100 USDC, service fee 4,000 USDC, not processed
    const loadSubmittedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      return { ...fixture, params };
    };

    it('returns the full deposit and the full service fee', async () => {
      const { params, user, stableCoins, fullRedemptionVault } =
        await loadSubmittedRequest();

      const balanceBefore = await stableCoins.usdc.balanceOf(user.address);

      await cancelFullRedemptionRequestTest(params, 0, user);

      expect(await stableCoins.usdc.balanceOf(user.address)).eq(
        balanceBefore.add(parseUnits('4100', 8)),
      );
      expect(await stableCoins.usdc.balanceOf(fullRedemptionVault.address)).eq(
        0,
      );
    });

    it('the refund address can differ from the wallet of the request', async () => {
      const { params, regularAccounts, stableCoins } =
        await loadSubmittedRequest();

      await cancelFullRedemptionRequestTest(params, 0, regularAccounts[3]);

      expect(await stableCoins.usdc.balanceOf(regularAccounts[3].address)).eq(
        parseUnits('4100', 8),
      );
    });

    it('a deposit in mTokens returns in mTokens', async () => {
      const { fullRedemptionVault, owner, stableCoins, mTBILL, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      const balanceBefore = await mTBILL.balanceOf(user.address);

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: user },
      );
      await cancelFullRedemptionRequestTest(params, 0, user);

      expect(await mTBILL.balanceOf(user.address)).eq(balanceBefore);
      expect(await mTBILL.balanceOf(fullRedemptionVault.address)).eq(0);
    });

    it('should fail: the request is processed', async () => {
      const { params, user, stableCoins, fullRedemptionVault } =
        await loadSubmittedRequest();

      await mintToken(stableCoins.dai, fullRedemptionVault, 4950);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      await cancelFullRedemptionRequestTest(params, 0, user, {
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.ReadyToRedeem],
        },
      });
    });

    it('should fail: the wallet of the request cannot cancel', async () => {
      const { params, user } = await loadSubmittedRequest();

      await cancelFullRedemptionRequestTest(params, 0, user, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });

    it('should fail: the refund address is the zero address, the request does not exist', async () => {
      const { params, user } = await loadSubmittedRequest();

      await cancelFullRedemptionRequestTest(params, 0, constants.AddressZero, {
        revertCustomError: { customErrorName: 'InvalidAddress' },
      });
      await cancelFullRedemptionRequestTest(params, 1, user, {
        revertCustomError: { customErrorName: 'RequestNotExists', args: [1] },
      });
    });
  });

  describe('pauseRequest() and unpauseRequest()', () => {
    // request 0 of `user`: 1,000 mTokens, processed, 5,000 USDC reserved.
    // In the fixture the pause manager has no delay for a pause and one day for an unpause
    const loadProcessedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      return { ...fixture, params };
    };

    const unpauseThroughTimelock = async (
      {
        fullRedemptionVault,
        timelockManager,
        timelock,
        accessControl,
        owner,
      }: Awaited<ReturnType<typeof loadProcessedRequest>>,
      requestId: number,
      executeOpt?: Parameters<typeof executeTimelockOperationTester>[4],
    ) => {
      const timelockParams = {
        timelockManager,
        timelock,
        accessControl,
        owner,
      };
      const data = fullRedemptionVault.interface.encodeFunctionData(
        'unpauseRequest',
        [requestId],
      );

      await scheduleTimelockOperationTester(
        timelockParams,
        fullRedemptionVault.address,
        data,
      );
      await increase(days(1));
      await executeTimelockOperationTester(
        timelockParams,
        fullRedemptionVault.address,
        data,
        owner.address,
        executeOpt,
      );
    };

    it('a paused request cannot be claimed and keeps its liquidity', async () => {
      const { params, user, fullRedemptionVault, stableCoins } =
        await loadProcessedRequest();

      await pauseFullRedemptionRequestTest(params, 0);

      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError: { customErrorName: 'RequestIsPaused', args: [0] },
      });
      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: user,
        revertCustomError: { customErrorName: 'RequestIsPaused', args: [0] },
      });

      // the liquidity of a paused request is still not free liquidity
      await withdrawFullRedemptionTokenTest(params, stableCoins.usdc, 1, {
        revertCustomError: { customErrorName: 'InsufficientFreeLiquidity' },
      });
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(5000));
    });

    it('a pause of one request does not stop another request', async () => {
      const { params, fullRedemptionVault, stableCoins, otherUser } =
        await loadProcessedRequest();

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 1, RATE_5);

      await pauseFullRedemptionRequestTest(params, 0);

      await claimFullRedemptionTest(params, 1, mTokens(1000), {
        from: otherUser,
      });
    });

    it('unpause through the timelock: the wallet can claim again', async () => {
      const fixture = await loadProcessedRequest();
      const { params, user, fullRedemptionVault } = fixture;

      await pauseFullRedemptionRequestTest(params, 0);
      await unpauseThroughTimelock(fixture, 0);

      expect((await fullRedemptionVault.getRequest(0)).paused).eq(false);

      await claimFullRedemptionTest(params, 0, mTokens(250), { from: user });
    });

    it('a paused request can be reallocated before the deadline', async () => {
      const { params } = await loadProcessedRequest();

      await reallocateFullRedemptionTest(params, 0, {
        revertCustomError: { customErrorName: 'DeadlineNotPassed' },
      });

      await pauseFullRedemptionRequestTest(params, 0);
      await reallocateFullRedemptionTest(params, 0);
    });

    it('a paused request that is not processed can be processed or cancelled', async () => {
      const { params, fullRedemptionVault, stableCoins, user, otherUser } =
        await loadProcessedRequest();

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: otherUser },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.dai,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);

      await pauseFullRedemptionRequestTest(params, 1);
      await pauseFullRedemptionRequestTest(params, 2);

      await processFullRedemptionRequestTest(params, 1, RATE_5);
      await cancelFullRedemptionRequestTest(params, 2, user);

      // request 1 is processed and still paused
      await claimFullRedemptionTest(params, 1, mTokens(250), {
        from: otherUser,
        revertCustomError: { customErrorName: 'RequestIsPaused' },
      });
    });

    it('should fail: the request does not exist, is already paused, or is final', async () => {
      const { params, user } = await loadProcessedRequest();

      await pauseFullRedemptionRequestTest(params, 1, {
        revertCustomError: { customErrorName: 'RequestNotExists', args: [1] },
      });

      await pauseFullRedemptionRequestTest(params, 0);
      await pauseFullRedemptionRequestTest(params, 0, {
        revertCustomError: { customErrorName: 'RequestIsPaused', args: [0] },
      });

      await reallocateFullRedemptionTest(params, 0);
      await pauseFullRedemptionRequestTest(params, 0, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
      await pauseFullRedemptionRequestTest(params, 0, {
        revertCustomError: {
          customErrorName: 'InvalidRequestStatus',
          args: [0, FrvStatus.Reallocated],
        },
      });
    });

    it('should fail: unpause of a request that is not paused', async () => {
      const fixture = await loadProcessedRequest();

      // the timelock runs the call and the call fails
      await unpauseThroughTimelock(fixture, 0, {
        revertOnFailure: false,
        expectExecutionSuccess: false,
      });

      expect((await fixture.fullRedemptionVault.getRequest(0)).paused).eq(
        false,
      );
    });

    it('should fail: unpause with no timelock while the pause manager has an unpause delay', async () => {
      const { params } = await loadProcessedRequest();

      await pauseFullRedemptionRequestTest(params, 0);

      await unpauseFullRedemptionRequestTest(params, 0, {
        revertCustomError: { customErrorName: 'SenderIsNotTimelock' },
      });
    });

    it('should fail: the caller is not an admin', async () => {
      const { params, user } = await loadProcessedRequest();

      await pauseFullRedemptionRequestTest(params, 0, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
      await unpauseFullRedemptionRequestTest(params, 0, {
        from: user,
        revertCustomError: acErrors.WMAC_HASNT_PERMISSION,
      });
    });
  });

  describe('edge cases', () => {
    // request 0 of `user`: 1,000 mTokens, processed, 5,000 USDC reserved, deposit and service fee in USDC
    const loadProcessedRequest = async () => {
      const fixture = await loadFixture(fullRedemptionVaultFixture);
      const { fullRedemptionVault, owner, stableCoins, user } = fixture;
      const params = { fullRedemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      return { ...fixture, params };
    };

    it('a vault with no deposit, no service fee and no receiver runs requests to the end', async () => {
      const {
        owner,
        accessControl,
        mockedSanctionsList,
        redemptionVault,
        mTBILL,
        stableCoins,
        user,
        otherUser,
      } = await loadFixture(fullRedemptionVaultFixture);

      const vault = await new FullRedemptionVaultTest__factory(owner).deploy();
      await vault.initialize({
        ac: accessControl.address,
        sanctionsList: mockedSanctionsList.address,
        redemptionVault: redemptionVault.address,
        ...FRV_TEST_SETTINGS,
        serviceFeeReceiver: constants.AddressZero,
        depositPercentageBps: 0,
        serviceFeeAmount: 0,
      });
      await accessControl['grantRole(bytes32,address)'](
        await mTBILL.burnerRole(),
        vault.address,
      );
      const params = { fullRedemptionVault: vault, owner };

      // no wallet has approved this vault: nothing is pulled at creation,
      // and a claim burns with the burner role, with no approval
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        mTBILL,
        mTokens(1000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, vault, 10_000);
      await safeProcessFullRedemptionRequestsTest(params, [0, 1], 'saved');

      await claimFullRedemptionTest(params, 0, mTokens(400), { from: user });
      await claimFullRedemptionTest(params, 0, mTokens(600), { from: user });

      await claimFullRedemptionTest(params, 1, mTokens(250), {
        from: otherUser,
      });
      await increase(days(31));
      await reallocateFullRedemptionTest(params, 1);

      expect(await stableCoins.usdc.balanceOf(vault.address)).eq(0);
      expect(await mTBILL.balanceOf(vault.address)).eq(0);
      expect(await vault.held(stableCoins.usdc.address)).eq(0);
    });

    it('should fail: the request is so small that nothing can be reserved. A cancel still works', async () => {
      const { fullRedemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };

      // 1 wei of mToken x 5 = 5 wei of USD: less than one unit of a token with 6 decimals
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc6,
        stableCoins.usdc6,
        1,
        { from: user },
      );
      await mintToken(stableCoins.usdc6, fullRedemptionVault, 1);

      await processFullRedemptionRequestTest(params, 0, RATE_5, {
        revertCustomError: { customErrorName: 'InvalidAmount' },
      });
      await safeProcessFullRedemptionRequestsTest(params, [0], 'saved', {
        revertCustomError: { customErrorName: 'InvalidAmount' },
      });

      await cancelFullRedemptionRequestTest(params, 0, user);
    });

    it('the token fee of a request is fixed at creation', async () => {
      const { fullRedemptionVault, redemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };
      const rvParams = { vault: redemptionVault, owner };

      // DAI has a token fee of 1%
      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      // after creation the RV changes the fee to 5% and gives the wallet a fee waiver
      await changeTokenFeeTest(rvParams, stableCoins.dai.address, 500);
      await setWaivedFeeAccountTest(rvParams, user.address, true);

      await mintToken(stableCoins.dai, fullRedemptionVault, 5000);
      await processFullRedemptionRequestTest(params, 0, RATE_5);

      // 1,000 mTokens x 5 USD, minus 1%
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(usd(4950));

      await adjustFullRedemptionRateTest(params, 0, parseUnits('5.05'));

      // 1,000 mTokens x 5.05 USD, minus 1%
      expect((await fullRedemptionVault.getRequest(0)).reserved).eq(
        usd('4999.5'),
      );
      expect((await fullRedemptionVault.getRequest(0)).feePercent).eq(100);
    });

    it('a cancel reads nothing from the RV: the payment token and the deposit asset can be removed', async () => {
      const { fullRedemptionVault, redemptionVault, owner, stableCoins, user } =
        await loadFixture(fullRedemptionVaultFixture);
      const params = { fullRedemptionVault, owner };
      const rvParams = { vault: redemptionVault, owner };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.dai,
        stableCoins.usdc,
        mTokens(1000),
        { from: user },
      );

      await removePaymentTokenTest(rvParams, stableCoins.dai);
      await removePaymentTokenTest(rvParams, stableCoins.usdc);

      await cancelFullRedemptionRequestTest(params, 0, user);
    });

    it('after the RV removed the payment token: no rate change, but a claim and a reallocation work', async () => {
      const { params, redemptionVault, owner, stableCoins, user } =
        await loadProcessedRequest();

      await removePaymentTokenTest(
        { vault: redemptionVault, owner },
        stableCoins.usdc,
      );

      await adjustFullRedemptionRateTest(params, 0, RATE_5, {
        revertCustomError: { customErrorName: 'UnknownPaymentToken' },
      });

      // the overload with a recipient, and the recipient is the wallet itself
      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: user,
      });

      await increase(days(31));
      await reallocateFullRedemptionTest(params, 0);
    });

    it('a pause of the whole contract stops create and claim, not the admin functions', async () => {
      const {
        params,
        fullRedemptionVault,
        pauseManager,
        owner,
        stableCoins,
        user,
        otherUser,
      } = await loadProcessedRequest();
      const revertCustomError = { customErrorName: 'Paused' };

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: otherUser },
      );
      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: otherUser },
      );
      await mintToken(stableCoins.usdc, fullRedemptionVault, 5010);

      await pauseVault({ pauseManager, owner }, fullRedemptionVault);

      await createFullRedemptionRequestTest(
        params,
        stableCoins.usdc,
        stableCoins.usdc,
        mTokens(1000),
        { from: user, revertCustomError },
      );
      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        revertCustomError,
      });
      await claimFullRedemptionTest(params, 0, mTokens(250), {
        from: user,
        recipient: otherUser,
        revertCustomError,
      });

      await processFullRedemptionRequestTest(params, 1, RATE_5);
      await cancelFullRedemptionRequestTest(params, 2, otherUser);
      await adjustFullRedemptionRateTest(params, 0, parseUnits('4.95'));
      await pauseFullRedemptionRequestTest(params, 0);
      await reallocateFullRedemptionTest(params, 0);
      await withdrawFullRedemptionTokenTest(
        params,
        stableCoins.usdc,
        parseUnits('10', 8),
      );
    });

    it('should fail: an admin function is paused', async () => {
      const { params, fullRedemptionVault, pauseManager, owner, stableCoins } =
        await loadProcessedRequest();
      const revertCustomError = { customErrorName: 'Paused' };

      await pauseVaultFn(
        { pauseManager, owner },
        fullRedemptionVault,
        [
          'adjustRate(uint256,uint256)',
          'reallocate(uint256)',
          'cancelRequest(uint256,address)',
          'pauseRequest(uint256)',
          'unpauseRequest(uint256)',
          'withdrawToken(address,uint256)',
        ].map(encodeFnSelector),
      );

      await adjustFullRedemptionRateTest(params, 0, RATE_5, {
        revertCustomError,
      });
      await reallocateFullRedemptionTest(params, 0, { revertCustomError });
      await cancelFullRedemptionRequestTest(params, 0, owner, {
        revertCustomError,
      });
      await pauseFullRedemptionRequestTest(params, 0, { revertCustomError });
      await unpauseFullRedemptionRequestTest(params, 0, { revertCustomError });
      await withdrawFullRedemptionTokenTest(params, stableCoins.usdc, 1, {
        revertCustomError,
      });
    });

    it('with no unpause delay in the pause manager, an admin unpauses with a direct call', async () => {
      const {
        params,
        pauseManager,
        timelockManager,
        timelock,
        accessControl,
        owner,
        user,
      } = await loadProcessedRequest();
      const timelockParams = {
        timelockManager,
        timelock,
        accessControl,
        owner,
      };

      const data = pauseManager.interface.encodeFunctionData(
        'setUnpauseDelay',
        [NO_DELAY],
      );
      await scheduleTimelockOperationTester(
        timelockParams,
        pauseManager.address,
        data,
      );
      await increase(days(2));
      await executeTimelockOperationTester(
        timelockParams,
        pauseManager.address,
        data,
        owner.address,
      );

      await unpauseFullRedemptionRequestTest(params, 0, {
        revertCustomError: { customErrorName: 'RequestNotPaused', args: [0] },
      });

      await pauseFullRedemptionRequestTest(params, 0);
      await unpauseFullRedemptionRequestTest(params, 0);

      await claimFullRedemptionTest(params, 0, mTokens(250), { from: user });
    });
  });
});
