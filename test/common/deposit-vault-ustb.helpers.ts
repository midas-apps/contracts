import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
  tokenAmountFromBase18,
} from './common.helpers';
import { depositInstantTest, getFeePercent } from './deposit-vault.helpers';
import { defaultDeploy } from './fixtures';

import {
  // eslint-disable-next-line camelcase
  ERC20,
  // eslint-disable-next-line camelcase
  ERC20__factory,
  ISuperstateToken,
  USTBMock,
} from '../../typechain-types';

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  | 'depositVaultWithUSTB'
  | 'owner'
  | 'mTBILL'
  | 'mTokenToUsdDataFeed'
  | 'ustbToken'
>;

type CommonParamsSetUstbDepositsEnabled = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithUSTB' | 'owner'
>;

export const setMockUstbStablecoinConfig = async (
  { ustbToken }: { ustbToken: USTBMock },
  stablecoin: AccountOrContract,
  config: ISuperstateToken.StablecoinConfigStruct = {
    fee: BigNumber.from(0),
    sweepDestination: ustbToken.address,
  },
) => {
  stablecoin = getAccount(stablecoin);
  await ustbToken.setStablecoinConfig(stablecoin, config);
};

export const setUstbDepositsEnabledTest = async (
  { depositVaultWithUSTB, owner }: CommonParamsSetUstbDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithUSTB
        .connect(opt?.from ?? owner)
        .setUstbDepositsEnabled(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithUSTB
      .connect(opt?.from ?? owner)
      .setUstbDepositsEnabled(enabled),
  ).to.emit(
    depositVaultWithUSTB,
    depositVaultWithUSTB.interface.events['SetUstbDepositsEnabled(bool)'].name,
  ).to.not.reverted;

  const ustbEnabledAfter = await depositVaultWithUSTB.ustbDepositsEnabled();
  expect(ustbEnabledAfter).eq(enabled);
};

export const depositInstantWithUstbTest = async (
  {
    depositVaultWithUSTB,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    ustbToken,
    expectedUstbDeposited = true,
  }: CommonParamsDeposit & {
    expectedUstbDeposited?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
  },
  tokenIn: ERC20 | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  if (opt?.revertMessage) {
    await depositInstantTest(
      {
        depositVault: depositVaultWithUSTB,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
        checkTokensReceiver: !expectedUstbDeposited,
      },
      tokenIn,
      amountUsdIn,
      opt,
    );
    return;
  }

  const amountIn = parseUnits(amountUsdIn.toFixed(18).replace(/\.?0+$/, ''));

  const tokensReceiver = await depositVaultWithUSTB.tokensReceiver();
  const ustbEnabledBefore = await depositVaultWithUSTB.ustbDepositsEnabled();
  const ustbSupplyBefore = await ustbToken.totalSupply();
  const ustbReceiverBalanceBefore = await ustbToken.balanceOf(tokensReceiver);

  const feePercent = await getFeePercent(
    owner.address,
    tokenIn,
    depositVaultWithUSTB,
    true,
  );

  const hundredPercent = await depositVaultWithUSTB.ONE_HUNDRED_PERCENT();
  const fee = amountIn.mul(feePercent).div(hundredPercent);

  const amountInWithoutFee = await tokenAmountFromBase18(
    // eslint-disable-next-line camelcase
    ERC20__factory.connect(tokenIn, owner),
    amountIn.sub(fee),
  );

  await depositInstantTest(
    {
      depositVault: depositVaultWithUSTB,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
      checkTokensReceiver: !expectedUstbDeposited,
    },
    tokenIn,
    amountUsdIn,
    opt,
  );

  const ustbEnabledAfter = await depositVaultWithUSTB.ustbDepositsEnabled();
  const ustbSupplyAfter = await ustbToken.totalSupply();
  const ustbReceiverBalanceAfter = await ustbToken.balanceOf(tokensReceiver);

  expect(ustbEnabledAfter).eq(ustbEnabledBefore);

  if (ustbEnabledAfter && expectedUstbDeposited) {
    expect(ustbSupplyAfter.sub(ustbSupplyBefore)).eq(amountInWithoutFee);
    expect(ustbReceiverBalanceAfter.sub(ustbReceiverBalanceBefore)).eq(
      amountInWithoutFee,
    );
  }
};
