import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { UsycArcContracts, usycArcFixture } from './fixtures/usyc.fixture';
import {
  getTellerExtras,
  setTellerLiquidity,
  setUsycEntitlement,
} from './helpers/usyc.helpers';

/**
 * Mints radYC to the test user through the radYC DV with radUSD, which also
 * funds the radYC RV with the subscribed USYC
 */
const mintRadYc = async (f: UsycArcContracts, radUsdAmount: BigNumber) => {
  const { radUSD, testUser, depositVaultWithUSYC } = f;
  await radUSD
    .connect(testUser)
    .approve(depositVaultWithUSYC.address, radUsdAmount);
  await depositVaultWithUSYC
    .connect(testUser)
    ['depositInstant(address,uint256,uint256,bytes32)'](
      radUSD.address,
      radUsdAmount,
      0,
      ethers.constants.HashZero,
    );
};

const redeemInstant = (
  { redemptionVaultWithUSYC, radYC }: UsycArcContracts,
  user: UsycArcContracts['testUser'],
  tokenOut: string,
  amount: BigNumber,
) =>
  radYC
    .connect(user)
    .approve(redemptionVaultWithUSYC.address, amount)
    .then(() =>
      redemptionVaultWithUSYC
        .connect(user)
        ['redeemInstant(address,uint256,uint256)'](tokenOut, amount, 0),
    );

describe('RedemptionVaultWithUSYC - Arc Fork Integration Tests (real USYC Teller)', function () {
  this.timeout(600000);

  it('full cycle: mint radYC with radUSD, then redeem radYC to radUSD via USYC -> USDC -> radUSD', async () => {
    const f = await loadFixture(usycArcFixture);
    const {
      radUSD,
      radYC,
      usyc,
      usdc,
      testUser,
      redemptionVaultWithUSYC,
      radYcFeed,
    } = f;

    await mintRadYc(f, parseUnits('1000'));
    const radYcBalance = await radYC.balanceOf(testUser.address);
    const toRedeem = radYcBalance.div(2);

    const rvUsycBefore = await usyc.balanceOf(redemptionVaultWithUSYC.address);
    const userRadUsdBefore = await radUSD.balanceOf(testUser.address);
    const radYcRate = await radYcFeed.feed.getDataInBase18();

    await expect(redeemInstant(f, testUser, radUSD.address, toRedeem)).to.not
      .reverted;

    // 0 fees, radUSD at 1$: user gets radYC * radYC price
    const expectedRadUsd = toRedeem.mul(radYcRate).div(parseUnits('1'));
    expect((await radUSD.balanceOf(testUser.address)).sub(userRadUsdBefore)).eq(
      expectedRadUsd,
    );
    expect(await radYC.balanceOf(testUser.address)).eq(
      radYcBalance.sub(toRedeem),
    );

    const rvUsycAfter = await usyc.balanceOf(redemptionVaultWithUSYC.address);
    expect(rvUsycAfter).lt(rvUsycBefore);
    // all redeemed USDC was converted into radUSD
    expect(await usdc.balanceOf(redemptionVaultWithUSYC.address)).eq(0);
    // only conversion dust (covering rounding) stays as radUSD in the vault
    expect(await radUSD.balanceOf(redemptionVaultWithUSYC.address)).lt(
      parseUnits('0.00001'),
    );
  });

  it('USDC-only product: radYC is redeemed to USDC directly from USYC', async () => {
    const f = await loadFixture(usycArcFixture);
    const {
      usdc,
      usdcFeed,
      radYC,
      testUser,
      redemptionVaultWithUSYC,
      owner,
      radYcFeed,
    } = f;

    await mintRadYc(f, parseUnits('1000'));
    await redemptionVaultWithUSYC
      .connect(owner)
      .addPaymentToken(
        usdc.address,
        usdcFeed.feed.address,
        0,
        ethers.constants.MaxUint256,
        true,
      );
    await redemptionVaultWithUSYC
      .connect(owner)
      .setDepositVault(ethers.constants.AddressZero);

    const toRedeem = (await radYC.balanceOf(testUser.address)).div(4);
    const radYcRate = await radYcFeed.feed.getDataInBase18();
    const userUsdcBefore = await usdc.balanceOf(testUser.address);

    await expect(redeemInstant(f, testUser, usdc.address, toRedeem)).to.not
      .reverted;

    const expectedUsdc = toRedeem
      .mul(radYcRate)
      .div(parseUnits('1'))
      .div(parseUnits('1', 12));
    expect((await usdc.balanceOf(testUser.address)).sub(userUsdcBefore)).eq(
      expectedUsdc,
    );
  });

  it('should fail: Circle treasury liquidity is lower than the redemption', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, radYC, teller, usdc, testUser, redemptionVaultWithUSYC } =
      f;

    await mintRadYc(f, parseUnits('1000'));
    await setTellerLiquidity(
      teller,
      usdc,
      redemptionVaultWithUSYC.address,
      parseUnits('10', 6),
    );
    // the real Teller caps maxRedeem by the treasury liquidity
    const maxRedeem = await teller.maxRedeem(redemptionVaultWithUSYC.address);
    const [maxAssets] = await teller.previewRedeemData(
      redemptionVaultWithUSYC.address,
      maxRedeem,
    );
    expect(maxAssets).lte(parseUnits('10', 6));

    const toRedeem = (await radYC.balanceOf(testUser.address)).div(2);
    await expect(
      redeemInstant(f, testUser, radUSD.address, toRedeem),
    ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
  });

  it('should fail: radYC RV is not entitled by Circle', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, radYC, entitlements, testUser, redemptionVaultWithUSYC } =
      f;

    await mintRadYc(f, parseUnits('1000'));
    await setUsycEntitlement(
      entitlements,
      redemptionVaultWithUSYC.address,
      false,
    );

    // the vault swallows the strategy failure and lacks radUSD...
    const toRedeem = (await radYC.balanceOf(testUser.address)).div(2);
    await expect(
      redeemInstant(f, testUser, radUSD.address, toRedeem),
    ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

    // ...because the real Teller rejects the redeem with NotPermissioned()
    await expect(
      redemptionVaultWithUSYC.checkAndRedeemUSYC(
        radUSD.address,
        parseUnits('10'),
      ),
    ).to.be.revertedWithCustomError(getTellerExtras(), 'NotPermissioned');
  });

  it('Teller totalAssets() is the immediately redeemable USDC and caps what the strategy redeems', async () => {
    const f = await loadFixture(usycArcFixture);
    const { usdc, usyc, teller, redemptionVaultWithUSYC } = f;
    const tellerExtras = getTellerExtras();
    const vault = redemptionVaultWithUSYC.address;

    await mintRadYc(f, parseUnits('1000'));

    for (const liquidity of ['1000000', '10', '0.5']) {
      await setTellerLiquidity(teller, usdc, vault, parseUnits(liquidity, 6));
      const treasury = await teller.treasury(vault);
      const [treasuryBalance, treasuryAllowance, totalAssets, usycBalance] =
        await Promise.all([
          usdc.balanceOf(treasury),
          usdc.allowance(treasury, teller.address),
          tellerExtras.totalAssets() as Promise<BigNumber>,
          usyc.balanceOf(vault),
        ]);

      // pooled liquidity = what the treasury can actually pay right now
      expect(totalAssets).eq(
        treasuryBalance.lt(treasuryAllowance)
          ? treasuryBalance
          : treasuryAllowance,
      );

      // maxRedeem, used by the strategy, is bounded by that liquidity
      const maxRedeem = await teller.maxRedeem(vault);
      const sharesForLiquidity: BigNumber = await tellerExtras.convertToShares(
        totalAssets,
      );
      expect(maxRedeem).eq(
        usycBalance.lt(sharesForLiquidity) ? usycBalance : sharesForLiquidity,
      );
      const [maxAssets] = await teller.previewRedeemData(vault, maxRedeem);
      expect(maxAssets).lte(totalAssets);
    }

    // with 0.5 USDC left, asking for 100 USDC redeems exactly maxRedeem
    const maxRedeem = await teller.maxRedeem(vault);
    const [maxAssets] = await teller.previewRedeemData(vault, maxRedeem);
    const usycBefore = await usyc.balanceOf(vault);
    const obtained =
      await redemptionVaultWithUSYC.callStatic.checkAndRedeemUSYC(
        usdc.address,
        parseUnits('100', 6),
      );
    await redemptionVaultWithUSYC.checkAndRedeemUSYC(
      usdc.address,
      parseUnits('100', 6),
    );

    expect(obtained).eq(maxAssets.mul(parseUnits('1', 12)));
    expect(usycBefore.sub(await usyc.balanceOf(vault))).eq(maxRedeem);
    expect(await usdc.balanceOf(vault)).eq(maxAssets);
  });

  it('USYC held by the radYC RV trails the radYC liability by at most the Teller spread across mints and redemptions', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, radYC, usyc, teller, testUser, redemptionVaultWithUSYC } =
      f;

    const vault = redemptionVaultWithUSYC.address;
    const [, , mintPrice] = await teller.previewDepositData(
      vault,
      parseUnits('1', 6),
    );
    const [, , redeemPrice] = await teller.previewRedeemData(
      vault,
      parseUnits('1', 6),
    );
    // sanity: Arc quotes a buy/sell spread, which is what this test is about
    expect(mintPrice).gt(redeemPrice);

    const cycles = [
      ['1000', 3],
      ['333.333333', 2],
      ['2500', 5],
    ] as const;
    let totalMintedRadUsd = BigNumber.from(0);
    for (const [mint, redeemShare] of cycles) {
      await mintRadYc(f, parseUnits(mint));
      totalMintedRadUsd = totalMintedRadUsd.add(parseUnits(mint));
      const toRedeem = (await radYC.balanceOf(testUser.address)).div(
        redeemShare,
      );
      await redeemInstant(f, testUser, radUSD.address, toRedeem);
    }

    // value of RV USYC (at the Teller redeem price) vs radYC liability, USDC units
    const rvUsyc = await usyc.balanceOf(vault);
    const [usycValue] = await teller.previewRedeemData(vault, rvUsyc);
    const radYcSupply = await radYC.totalSupply();
    const liability = radYcSupply
      .mul(await f.radYcFeed.feed.getDataInBase18())
      .div(parseUnits('1'))
      .div(parseUnits('1', 12));

    // every mint buys USYC at the mint price while radYC is priced at the
    // redeem price, so the RV is short by the spread on each minted amount
    // and is never over-collateralised
    expect(usycValue).lte(liability);
    const spreadShortfall = totalMintedRadUsd
      .mul(mintPrice.sub(redeemPrice))
      .div(mintPrice)
      .div(parseUnits('1', 12));
    // rounding: covering conversions on each redemption, floor on each mint
    const roundingDust = BigNumber.from(5 * cycles.length * 2);
    expect(liability.sub(usycValue)).lte(spreadShortfall.add(roundingDust));

    // in USYC units the RV holds less USYC than circulating radYC
    expect(rvUsyc.mul(parseUnits('1', 12))).lt(radYcSupply);
    expect(await radUSD.balanceOf(vault)).lt(parseUnits('0.0001'));
  });
});
