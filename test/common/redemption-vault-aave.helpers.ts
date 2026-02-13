import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';

import { AccountOrContract, OptionalCommonParams } from './common.helpers';
import { redeemInstantTest } from './redemption-vault.helpers';

import {
  IERC20,
  RedemptionVaultWithAave,
  MTBILLTest,
  DataFeedTest,
} from '../../typechain-types';

type RedemptionWithAaveParams = {
  redemptionVault: RedemptionVaultWithAave;
  owner: SignerWithAddress;
  mTBILL: MTBILLTest;
  mTokenToUsdDataFeed: DataFeedTest;
  usdc: IERC20;
  aToken: IERC20;
  waivedFee?: boolean;
  minAmount?: BigNumberish;
  expectedATokenUsed?: BigNumber;
  expectedUsdcUsed?: BigNumber;
  customRecipient?: AccountOrContract;
};

export const redeemInstantWithAaveTest = async (
  params: RedemptionWithAaveParams,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  const {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    usdc,
    aToken,
    expectedATokenUsed,
    expectedUsdcUsed,
    customRecipient,
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
        customRecipient,
      },
      usdc,
      amountTBillIn,
      opt,
    );
    return undefined;
  }

  const sender = opt?.from ?? owner;
  const [vaultUSDCBefore, vaultATokenBefore, userUSDCBefore] =
    await Promise.all([
      usdc.balanceOf(redemptionVault.address),
      aToken.balanceOf(redemptionVault.address),
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
      customRecipient,
    },
    usdc,
    amountTBillIn,
    opt,
  );

  const [vaultUSDCAfter, vaultATokenAfter, userUSDCAfter] = await Promise.all([
    usdc.balanceOf(redemptionVault.address),
    aToken.balanceOf(redemptionVault.address),
    usdc.balanceOf(sender.address),
  ]);

  const usdcUsed = vaultUSDCBefore.sub(vaultUSDCAfter);
  const aTokenUsed = vaultATokenBefore.sub(vaultATokenAfter);

  if (expectedATokenUsed !== undefined) {
    expect(aTokenUsed).to.equal(expectedATokenUsed);
  }
  if (expectedUsdcUsed !== undefined) {
    expect(usdcUsed).to.equal(expectedUsdcUsed);
  }

  return {
    usdcUsed,
    aTokenUsed,
    userUSDCReceived: userUSDCAfter.sub(userUSDCBefore),
    vaultUSDCBefore,
    vaultUSDCAfter,
    vaultATokenBefore,
    vaultATokenAfter,
  };
};
