import { expect } from 'chai';
import { BigNumberish } from 'ethers';

import {
  AccountOrContract,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import {
  depositInstantTest,
  depositRequestTest,
} from './deposit-vault.helpers';
import { defaultDeploy } from './fixtures';

import {
  DepositVault__factory,
  ERC20,
  ERC20__factory,
  IERC20Metadata,
} from '../../typechain-types';

type CommonParamsDeposit = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithMToken' | 'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
>;

type CommonParamsSetMTokenDepositsEnabled = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithMToken' | 'owner'
>;

type CommonParamsSetMTokenDepositVault = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithMToken' | 'owner'
>;

export const setMTokenDepositsEnabledTest = async (
  { depositVaultWithMToken, owner }: CommonParamsSetMTokenDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMToken
        .connect(opt?.from ?? owner)
        .setMTokenDepositsEnabled(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMToken
      .connect(opt?.from ?? owner)
      .setMTokenDepositsEnabled(enabled),
  ).to.emit(
    depositVaultWithMToken,
    depositVaultWithMToken.interface.events['SetMTokenDepositsEnabled(bool)']
      .name,
  ).to.not.reverted;

  const mTokenEnabledAfter =
    await depositVaultWithMToken.mTokenDepositsEnabled();
  expect(mTokenEnabledAfter).eq(enabled);
};

export const setMTokenDepositVaultTest = async (
  { depositVaultWithMToken, owner }: CommonParamsSetMTokenDepositVault,
  newVault: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMToken
        .connect(opt?.from ?? owner)
        .setMTokenDepositVault(newVault),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMToken
      .connect(opt?.from ?? owner)
      .setMTokenDepositVault(newVault),
  ).to.emit(
    depositVaultWithMToken,
    depositVaultWithMToken.interface.events[
      'SetMTokenDepositVault(address,address)'
    ].name,
  ).to.not.reverted;

  const vaultAfter = await depositVaultWithMToken.mTokenDepositVault();
  expect(vaultAfter).eq(newVault);
};

export const depositInstantWithMTokenTest = async (
  {
    depositVaultWithMToken,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    minAmount,
    customRecipient,
    expectedMTokenDeposited = true,
  }: CommonParamsDeposit & {
    expectedMTokenDeposited?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
  },
  tokenIn: ERC20 | IERC20Metadata | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  if (opt?.revertMessage) {
    await depositInstantTest(
      {
        depositVault: depositVaultWithMToken,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
        checkTokensReceiver: !expectedMTokenDeposited,
      },
      tokenIn,
      amountUsdIn,
      opt,
    );
    return;
  }

  const tokensReceiver = await depositVaultWithMToken.tokensReceiver();
  const mTokenEnabledBefore =
    await depositVaultWithMToken.mTokenDepositsEnabled();

  const targetDvAddress = await depositVaultWithMToken.mTokenDepositVault();
  const targetDv = DepositVault__factory.connect(targetDvAddress, owner);
  const targetMTokenAddress = await targetDv.mToken();

  const targetMTokenContract = ERC20__factory.connect(
    targetMTokenAddress,
    owner,
  );

  const targetMTokenReceiverBefore = await balanceOfBase18(
    targetMTokenContract,
    tokensReceiver,
  );

  await depositInstantTest(
    {
      depositVault: depositVaultWithMToken,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
      checkTokensReceiver: !expectedMTokenDeposited,
    },
    tokenIn,
    amountUsdIn,
    opt,
  );

  const mTokenEnabledAfter =
    await depositVaultWithMToken.mTokenDepositsEnabled();
  expect(mTokenEnabledAfter).eq(mTokenEnabledBefore);

  if (mTokenEnabledAfter && expectedMTokenDeposited) {
    const targetMTokenReceiverAfter = await balanceOfBase18(
      targetMTokenContract,
      tokensReceiver,
    );
    const mTokenReceived = targetMTokenReceiverAfter.sub(
      targetMTokenReceiverBefore,
    );
    expect(mTokenReceived).to.be.gt(0);
  }
};

export const setAutoInvestFallbackEnabledMTokenTest = async (
  { depositVaultWithMToken, owner }: CommonParamsSetMTokenDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMToken
        .connect(opt?.from ?? owner)
        .setAutoInvestFallbackEnabled(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMToken
      .connect(opt?.from ?? owner)
      .setAutoInvestFallbackEnabled(enabled),
  ).to.emit(
    depositVaultWithMToken,
    depositVaultWithMToken.interface.events[
      'SetAutoInvestFallbackEnabled(bool)'
    ].name,
  ).to.not.reverted;

  const fallbackEnabledAfter =
    await depositVaultWithMToken.autoInvestFallbackEnabled();
  expect(fallbackEnabledAfter).eq(enabled);
};

export const depositRequestWithMTokenTest = async (
  {
    depositVaultWithMToken,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    waivedFee,
    customRecipient,
    expectedMTokenDeposited = true,
  }: CommonParamsDeposit & {
    expectedMTokenDeposited?: boolean;
    waivedFee?: boolean;
    customRecipient?: AccountOrContract;
  },
  tokenIn: ERC20 | IERC20Metadata | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  if (opt?.revertMessage) {
    await depositRequestTest(
      {
        depositVault: depositVaultWithMToken,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        customRecipient,
        checkTokensReceiver: !expectedMTokenDeposited,
      },
      tokenIn,
      amountUsdIn,
      opt,
    );
    return {};
  }

  const tokensReceiver = await depositVaultWithMToken.tokensReceiver();
  const mTokenEnabledBefore =
    await depositVaultWithMToken.mTokenDepositsEnabled();

  const targetDvAddress = await depositVaultWithMToken.mTokenDepositVault();
  const targetDv = DepositVault__factory.connect(targetDvAddress, owner);
  const targetMTokenAddress = await targetDv.mToken();
  const targetMTokenContract = ERC20__factory.connect(
    targetMTokenAddress,
    owner,
  );

  const targetMTokenReceiverBefore = await balanceOfBase18(
    targetMTokenContract,
    tokensReceiver,
  );

  const result = await depositRequestTest(
    {
      depositVault: depositVaultWithMToken,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      customRecipient,
      checkTokensReceiver: !expectedMTokenDeposited,
    },
    tokenIn,
    amountUsdIn,
    opt,
  );

  const mTokenEnabledAfter =
    await depositVaultWithMToken.mTokenDepositsEnabled();
  expect(mTokenEnabledAfter).eq(mTokenEnabledBefore);

  if (mTokenEnabledAfter && expectedMTokenDeposited) {
    const targetMTokenReceiverAfter = await balanceOfBase18(
      targetMTokenContract,
      tokensReceiver,
    );
    const mTokenReceived = targetMTokenReceiverAfter.sub(
      targetMTokenReceiverBefore,
    );
    expect(mTokenReceived).to.be.gt(0);
  }

  return result;
};
