import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { UsycArcContracts, usycArcFixture } from './fixtures/usyc.fixture';
import {
  NOT_PERMISSIONED_SELECTOR,
  setUsycEntitlement,
} from './helpers/usyc.helpers';

const depositInstant = (
  { depositVaultWithUSYC }: UsycArcContracts,
  user: UsycArcContracts['testUser'],
  token: string,
  amount: BigNumber,
) =>
  depositVaultWithUSYC
    .connect(user)
    ['depositInstant(address,uint256,uint256,bytes32)'](
      token,
      amount,
      0,
      ethers.constants.HashZero,
    );

const snapshot = async (f: UsycArcContracts) => {
  const {
    usyc,
    usdc,
    radUSD,
    radYC,
    depositVaultWithUSYC,
    redemptionVaultWithUSYC,
    testUser,
  } = f;
  return {
    rvUsyc: await usyc.balanceOf(redemptionVaultWithUSYC.address),
    rvUsdc: await usdc.balanceOf(redemptionVaultWithUSYC.address),
    dvUsyc: await usyc.balanceOf(depositVaultWithUSYC.address),
    dvUsdc: await usdc.balanceOf(depositVaultWithUSYC.address),
    dvRadUsd: await radUSD.balanceOf(depositVaultWithUSYC.address),
    radUsdSupply: await radUSD.totalSupply(),
    userRadYc: await radYC.balanceOf(testUser.address),
  };
};

describe('DepositVaultWithUSYC - Arc Fork Integration Tests (real USYC Teller)', function () {
  this.timeout(600000);

  it('mints radYC for radUSD: radUSD -> USDC -> USYC, USYC lands in the radYC RV', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, testUser, teller, depositVaultWithUSYC, radYcFeed } = f;
    const amount = parseUnits('1000');

    await radUSD
      .connect(testUser)
      .approve(depositVaultWithUSYC.address, amount);
    const before = await snapshot(f);

    // 1000 radUSD at 1$ -> 1000 USDC, priced by the real Teller
    const [expectedUsyc] = await teller.previewDepositData(
      depositVaultWithUSYC.address,
      parseUnits('1000', 6),
    );
    const radYcRate = await radYcFeed.feed.getDataInBase18();

    await expect(depositInstant(f, testUser, radUSD.address, amount)).to.not
      .reverted;

    const after = await snapshot(f);
    expect(after.radUsdSupply).eq(before.radUsdSupply.sub(amount));
    expect(after.rvUsyc.sub(before.rvUsyc)).eq(expectedUsyc);
    expect(after.userRadYc.sub(before.userRadYc)).eq(
      amount.mul(parseUnits('1')).div(radYcRate),
    );

    // nothing is left on the DV
    expect(after.dvUsyc).eq(0);
    expect(after.dvUsdc).eq(0);
    expect(after.dvRadUsd).eq(0);
  });

  it('USDC-only product: USDC is subscribed directly without a Midas vault', async () => {
    const f = await loadFixture(usycArcFixture);
    const { usdc, usdcFeed, testUser, teller, depositVaultWithUSYC, owner } = f;
    const amountBase18 = parseUnits('250');
    const amountUsdc = parseUnits('250', 6);

    await depositVaultWithUSYC
      .connect(owner)
      .addPaymentToken(
        usdc.address,
        usdcFeed.feed.address,
        0,
        ethers.constants.MaxUint256,
        true,
      );
    await depositVaultWithUSYC
      .connect(owner)
      .setRedemptionVault(ethers.constants.AddressZero);
    await usdc
      .connect(testUser)
      .approve(depositVaultWithUSYC.address, amountUsdc);

    const before = await snapshot(f);
    const [expectedUsyc] = await teller.previewDepositData(
      depositVaultWithUSYC.address,
      amountUsdc,
    );

    await expect(depositInstant(f, testUser, usdc.address, amountBase18)).to.not
      .reverted;

    const after = await snapshot(f);
    expect(after.rvUsyc.sub(before.rvUsyc)).eq(expectedUsyc);
    expect(after.radUsdSupply).eq(before.radUsdSupply);
    expect(after.dvUsdc).eq(0);
  });

  it('should fail: radYC DV is not entitled by Circle and fallback is disabled', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, testUser, depositVaultWithUSYC, entitlements } = f;
    const amount = parseUnits('100');

    await setUsycEntitlement(entitlements, depositVaultWithUSYC.address, false);
    await radUSD
      .connect(testUser)
      .approve(depositVaultWithUSYC.address, amount);

    // the real Teller rejects the deposit with NotPermissioned()
    await expect(depositInstant(f, testUser, radUSD.address, amount))
      .to.be.revertedWithCustomError(depositVaultWithUSYC, 'AutoInvestFailed')
      .withArgs(NOT_PERMISSIONED_SELECTOR);
  });

  it('should fail: anticipated fee rate does not match the real Teller subscription fee rate', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, testUser, depositVaultWithUSYC, teller, owner } = f;
    const amount = parseUnits('100');

    const actualRate = await teller.subscriptionFeeRate(
      depositVaultWithUSYC.address,
    );
    await depositVaultWithUSYC
      .connect(owner)
      .setAnticipatedFeeRate(actualRate.add(1));
    await radUSD
      .connect(testUser)
      .approve(depositVaultWithUSYC.address, amount);

    await expect(depositInstant(f, testUser, radUSD.address, amount))
      .to.be.revertedWithCustomError(depositVaultWithUSYC, 'AutoInvestFailed')
      .withArgs(
        depositVaultWithUSYC.interface.encodeErrorResult('FeeNotMatched', [
          actualRate,
        ]),
      );
  });

  it('fallback enabled: when the Teller rejects the DV, USDC (not radUSD) goes to the radYC RV', async () => {
    const f = await loadFixture(usycArcFixture);
    const { radUSD, testUser, depositVaultWithUSYC, entitlements, owner } = f;
    const amount = parseUnits('100');

    await setUsycEntitlement(entitlements, depositVaultWithUSYC.address, false);
    await depositVaultWithUSYC
      .connect(owner)
      .setAutoInvestFallbackEnabled(true);
    await radUSD
      .connect(testUser)
      .approve(depositVaultWithUSYC.address, amount);

    const before = await snapshot(f);
    await expect(depositInstant(f, testUser, radUSD.address, amount)).to.not
      .reverted;
    const after = await snapshot(f);

    expect(after.rvUsyc).eq(before.rvUsyc);
    expect(after.rvUsdc.sub(before.rvUsdc)).eq(parseUnits('100', 6));
    expect(after.radUsdSupply).eq(before.radUsdSupply.sub(amount));
    expect(after.dvUsdc).eq(0);
  });

  it('should fail: radUSD RV has no USDC to redeem radUSD', async () => {
    const f = await loadFixture(usycArcFixture);
    const {
      radUSD,
      usdc,
      testUser,
      depositVaultWithUSYC,
      radUsdRedemptionVault,
      owner,
    } = f;
    const amount = parseUnits('100');

    await radUsdRedemptionVault
      .connect(owner)
      .withdrawToken(
        usdc.address,
        await usdc.balanceOf(radUsdRedemptionVault.address),
      );
    await radUSD
      .connect(testUser)
      .approve(depositVaultWithUSYC.address, amount);

    // the radUSD RV cannot pay the USDC out, fallback does not apply
    await expect(
      depositInstant(f, testUser, radUSD.address, amount),
    ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
  });
});
