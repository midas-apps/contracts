import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';

import { OptionalCommonParams } from './common.helpers';
import { redeemInstantTest } from './redemption-vault.helpers';

import {
  IERC20,
  RedemptionVaultWithUSTB,
  MTBILLTest,
  DataFeedTest,
} from '../../typechain-types';

type RedemptionWithUSTBParams = {
  redemptionVault: RedemptionVaultWithUSTB;
  owner: SignerWithAddress;
  mTBILL: MTBILLTest;
  mTokenToUsdDataFeed: DataFeedTest;
  usdc: IERC20;
  ustbToken: IERC20;
  waivedFee?: boolean;
  minAmount?: BigNumberish;
  expectedUstbUsed?: BigNumber;
  expectedUsdcUsed?: BigNumber;
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
  } = params;

  if (opt?.revertMessage) {
    await redeemInstantTest(
      {
        redemptionVault,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee: params.waivedFee,
        minAmount: params.minAmount,
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

  await redeemInstantTest(
    {
      redemptionVault,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee: params.waivedFee,
      minAmount: params.minAmount,
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
