import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  AccountOrContract,
  OptionalCommonParams,
  shouldRevert,
} from './common.helpers';
import { redeemInstantTest } from './redemption-vault.helpers';

import {
  IERC20,
  RedemptionVaultWithUSTB,
  DataFeedTest,
  MToken,
} from '../../typechain-types';

type RedemptionWithUSTBParams = {
  redemptionVault: RedemptionVaultWithUSTB;
  owner: SignerWithAddress;
  mTBILL: MToken;
  mTokenToUsdDataFeed: DataFeedTest;
  usdc: IERC20;
  ustbToken: IERC20;
  waivedFee?: boolean;
  minAmount?: BigNumberish;
  expectedUstbUsed?: BigNumber;
  expectedUsdcUsed?: BigNumber;
  customRecipient?: AccountOrContract;
};

export const redeemInstantWithUstbTest = async (
  params: RedemptionWithUSTBParams,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  const {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    usdc,
    ustbToken,
    expectedUstbUsed,
    expectedUsdcUsed,
    customRecipient,
  } = params;

  if (shouldRevert(opt)) {
    await redeemInstantTest(
      {
        redemptionVault,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee: params.waivedFee,
        minAmount: params.minAmount,
        customRecipient,
      },
      usdc,
      amountTBillIn,
      opt,
    );
    return undefined;
  }

  const sender = opt?.from ?? owner;
  const [vaultUSDCBefore, vaultUSTBBefore, userUSDCBefore] = await Promise.all([
    usdc.balanceOf(redemptionVault.address),
    ustbToken.balanceOf(redemptionVault.address),
    usdc.balanceOf(sender.address),
  ]);

  const ustbRedemption = await ethers.getContractAt(
    'IUSTBRedemption',
    await redemptionVault.ustbRedemption(),
  );
  // Value the vault's USTB in tokenOut (USDC) units using the redemption
  // contract's own linear price, probed via calculateUstbIn. A large probe
  // keeps the price ratio precise enough that valuing a whole USTB position
  // doesn't accumulate meaningful rounding.
  const usdcProbe = parseUnits('10000000', 6);
  const valueUstbInUsdc = async () => {
    const ustbBalance = await ustbToken.balanceOf(redemptionVault.address);
    if (ustbBalance.isZero()) {
      return BigNumber.from(0);
    }
    const [ustbInPerUsdcProbe] = await ustbRedemption.calculateUstbIn(
      usdcProbe,
    );
    return ustbBalance.mul(usdcProbe).div(ustbInPerUsdcProbe);
  };

  await redeemInstantTest(
    {
      redemptionVault,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee: params.waivedFee,
      minAmount: params.minAmount,
      customRecipient,
      // The vault's USTB is extra tokenOut liquidity redeemable for USDC.
      additionalLiquidity: valueUstbInUsdc,
      // Absorb price-conversion rounding across the redeem block.
      vaultBalanceTolerance: parseUnits('0.01', 6),
    },
    usdc,
    amountTBillIn,
    opt,
  );

  const [vaultUSDCAfter, vaultUSTBAfter, userUSDCAfter] = await Promise.all([
    usdc.balanceOf(redemptionVault.address),
    ustbToken.balanceOf(redemptionVault.address),
    usdc.balanceOf(sender.address),
  ]);

  const usdcUsed = vaultUSDCBefore.sub(vaultUSDCAfter);
  const ustbUsed = vaultUSTBBefore.sub(vaultUSTBAfter);

  if (expectedUstbUsed !== undefined) {
    expect(ustbUsed).to.equal(expectedUstbUsed);
  }
  if (expectedUsdcUsed !== undefined) {
    expect(usdcUsed).to.equal(expectedUsdcUsed);
  }

  return {
    usdcUsed,
    ustbUsed,
    userUSDCReceived: userUSDCAfter.sub(userUSDCBefore),
    vaultUSDCBefore,
    vaultUSDCAfter,
    vaultUSTBBefore,
    vaultUSTBAfter,
  };
};
