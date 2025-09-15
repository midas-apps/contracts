import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  // eslint-disable-next-line camelcase
  AcreAdapter__factory,
  // eslint-disable-next-line camelcase
  DepositVaultTest__factory,
} from '../../../typechain-types';
import { acreAdapterFixture } from '../../common/fixtures';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  changeTokenFeeTest,
  removePaymentTokenTest,
  removeWaivedFeeAccountTest,
  setInstantFeeTest,
} from '../../common/manageable-vault.helpers';
import {
  acreWrapperDepositTest,
  acreWrapperRequestRedeemTest,
} from '../../common/misc/acre.helpers';

describe.only('AcreAdapter', () => {
  it('initialize', async () => {
    const fixture = await loadFixture(acreAdapterFixture);

    expect(await fixture.acreUsdcMTbillAdapter.depositVault()).eq(
      fixture.depositVault.address,
    );
    expect(await fixture.acreUsdcMTbillAdapter.redemptionVault()).eq(
      fixture.redemptionVault.address,
    );
    expect(await fixture.acreUsdcMTbillAdapter.asset()).eq(
      fixture.stableCoins.usdc.address,
    );
    expect(await fixture.acreUsdcMTbillAdapter.share()).eq(
      fixture.mTBILL.address,
    );
    expect(await fixture.acreUsdcMTbillAdapter.assetTokenDecimals()).eq(8);
    expect(await fixture.acreUsdcMTbillAdapter.mTokenDataFeed()).eq(
      fixture.mTokenToUsdDataFeed.address,
    );

    const dvWithDifferentDataFeed = await new DepositVaultTest__factory(
      fixture.owner,
    ).deploy();

    await dvWithDifferentDataFeed.initialize(
      fixture.accessControl.address,
      {
        mToken: fixture.mTBILL.address,
        mTokenDataFeed: fixture.dataFeed.address,
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
      constants.MaxUint256,
    );

    await expect(
      fixture.owner.sendTransaction(
        new AcreAdapter__factory().getDeployTransaction(
          fixture.depositVault.address,
          fixture.redemptionVault.address,
          fixture.stableCoins.usdc.address,
        ),
      ),
    ).not.reverted;

    await expect(
      fixture.owner.sendTransaction(
        new AcreAdapter__factory().getDeployTransaction(
          fixture.depositVault.address,
          fixture.redemptionVaultWithSwapper.address,
          fixture.stableCoins.usdc.address,
        ),
      ),
    ).revertedWith('mToken mismatch');

    await expect(
      fixture.owner.sendTransaction(
        new AcreAdapter__factory().getDeployTransaction(
          dvWithDifferentDataFeed.address,
          fixture.redemptionVault.address,
          fixture.stableCoins.usdc.address,
        ),
      ),
    ).revertedWith('mTokenDataFeed mismatch');
  });

  describe('deposit', () => {
    it('should deposit USDC to the deposit vault', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await acreWrapperDepositTest(fixture, 100);
    });

    it('should deposit USDC to the deposit vault when receiver is different from msg.sender', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await acreWrapperDepositTest(fixture, 100, fixture.regularAccounts[1]);
    });

    it('should deposit USDC to the deposit vault when all fees are waived', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await setInstantFeeTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        10,
      );

      await addWaivedFeeAccountTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        fixture.acreUsdcMTbillAdapter.address,
      );
      await acreWrapperDepositTest(fixture, 100);
    });

    it('should deposit USDC to the deposit vault when asset is not stable', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await removePaymentTokenTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
      );

      await addPaymentTokenTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
        fixture.dataFeed.address,
        0,
        false,
      );

      await acreWrapperDepositTest(fixture, 100);
    });

    it('should fail: when instant fee is not 0', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await setInstantFeeTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        10,
      );

      await acreWrapperDepositTest(fixture, 100, undefined, {
        revertMessage: 'DV: minReceiveAmount > actual',
      });
    });

    it('should fail: when token fee is not 0', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await changeTokenFeeTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        fixture.stableCoins.usdc.address,
        10,
      );

      await acreWrapperDepositTest(fixture, 100, undefined, {
        revertMessage: 'DV: minReceiveAmount > actual',
      });
    });
  });

  describe('redeemRequest', () => {
    it('should create redeem request for USDC', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await acreWrapperRequestRedeemTest(fixture, 20);
    });

    it('should create redeem request for USDC when receiver is different from msg.sender', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await acreWrapperRequestRedeemTest(
        fixture,
        20,
        fixture.regularAccounts[1],
      );
    });

    it('should deposit USDC to the deposit vault when all fees are waived', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await setInstantFeeTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        10,
      );

      await acreWrapperRequestRedeemTest(fixture, 20);
    });

    it('should deposit USDC to the deposit vault when asset is not stable', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await removePaymentTokenTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
      );

      await addPaymentTokenTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
        fixture.dataFeed.address,
        0,
        false,
      );

      await acreWrapperRequestRedeemTest(fixture, 20);
    });

    it('when instant fee is not 0', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await setInstantFeeTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        10,
      );

      await acreWrapperRequestRedeemTest(fixture, 20);
    });

    it('when token fee is not 0', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await changeTokenFeeTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.stableCoins.usdc.address,
        10,
      );

      await acreWrapperRequestRedeemTest(fixture, 20);
    });

    it('should fail: when not fee waived', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await removeWaivedFeeAccountTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.acreUsdcMTbillAdapter.address,
      );

      await acreWrapperRequestRedeemTest(fixture, 20, undefined, {
        revertMessage: 'not fee waived',
      });
    });
  });

  describe('convertToAssets', () => {
    it('1 share = 5 asset', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      expect(
        await fixture.acreUsdcMTbillAdapter.convertToAssets(parseUnits('1')),
      ).eq(parseUnits('5', 8));
    });

    it('0 share = 0 asset', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      expect(await fixture.acreUsdcMTbillAdapter.convertToAssets(0)).eq(0);
    });

    it('when isStable flag is false', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await removePaymentTokenTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
      );

      await addPaymentTokenTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
        fixture.dataFeed.address,
        0,
        false,
      );

      expect(
        await fixture.acreUsdcMTbillAdapter.convertToAssets(parseUnits('1')),
      ).eq(parseUnits('4.90196078', 8));
    });

    it('should not account any fees', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await removeWaivedFeeAccountTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        fixture.acreUsdcMTbillAdapter.address,
      );

      await setInstantFeeTest(
        { vault: fixture.redemptionVault, owner: fixture.owner },
        10,
      );

      expect(
        await fixture.acreUsdcMTbillAdapter.convertToAssets(parseUnits('1')),
      ).eq(parseUnits('5', 8));
    });
  });

  describe('convertToShares', () => {
    it('1 asset = 0.2 share', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      expect(
        await fixture.acreUsdcMTbillAdapter.convertToShares(parseUnits('1', 8)),
      ).eq(parseUnits('0.2'));
    });

    it('0 asset = 0 share', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      expect(await fixture.acreUsdcMTbillAdapter.convertToShares(0)).eq(0);
    });

    it('when isStable flag is false', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await removePaymentTokenTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
      );

      await addPaymentTokenTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        fixture.stableCoins.usdc,
        fixture.dataFeed.address,
        0,
        false,
      );

      expect(
        await fixture.acreUsdcMTbillAdapter.convertToShares(parseUnits('1', 8)),
      ).eq(parseUnits('0.204'));
    });

    it('should not account any fees', async () => {
      const fixture = await loadFixture(acreAdapterFixture);

      await setInstantFeeTest(
        { vault: fixture.depositVault, owner: fixture.owner },
        10,
      );

      expect(
        await fixture.acreUsdcMTbillAdapter.convertToShares(parseUnits('1', 8)),
      ).eq(parseUnits('0.2'));
    });
  });
});
