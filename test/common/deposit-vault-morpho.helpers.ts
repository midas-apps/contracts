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
  ERC20,
  ERC20__factory,
  IERC20Metadata,
  MorphoVaultMock,
} from '../../typechain-types';

type CommonParamsDeposit = {
  morphoVaultMock: MorphoVaultMock;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithMorpho' | 'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
>;

type CommonParamsSetMorphoDepositsEnabled = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithMorpho' | 'owner'
>;

type CommonParamsSetMorphoVault = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithMorpho' | 'owner'
>;

export const setMorphoDepositsEnabledTest = async (
  { depositVaultWithMorpho, owner }: CommonParamsSetMorphoDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMorpho
        .connect(opt?.from ?? owner)
        .setMorphoDepositsEnabled(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMorpho
      .connect(opt?.from ?? owner)
      .setMorphoDepositsEnabled(enabled),
  ).to.emit(
    depositVaultWithMorpho,
    depositVaultWithMorpho.interface.events['SetMorphoDepositsEnabled(bool)']
      .name,
  ).to.not.reverted;

  const morphoEnabledAfter =
    await depositVaultWithMorpho.morphoDepositsEnabled();
  expect(morphoEnabledAfter).eq(enabled);
};

export const setMorphoVaultTest = async (
  { depositVaultWithMorpho, owner }: CommonParamsSetMorphoVault,
  token: string,
  vault: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMorpho
        .connect(opt?.from ?? owner)
        .setMorphoVault(token, vault),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMorpho
      .connect(opt?.from ?? owner)
      .setMorphoVault(token, vault),
  ).to.emit(
    depositVaultWithMorpho,
    depositVaultWithMorpho.interface.events[
      'SetMorphoVault(address,address,address)'
    ].name,
  ).to.not.reverted;

  const vaultAfter = await depositVaultWithMorpho.morphoVaults(token);
  expect(vaultAfter).eq(vault);
};

export const removeMorphoVaultTest = async (
  { depositVaultWithMorpho, owner }: CommonParamsSetMorphoVault,
  token: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMorpho
        .connect(opt?.from ?? owner)
        .removeMorphoVault(token),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMorpho.connect(opt?.from ?? owner).removeMorphoVault(token),
  ).to.emit(
    depositVaultWithMorpho,
    depositVaultWithMorpho.interface.events[
      'RemoveMorphoVault(address,address)'
    ].name,
  ).to.not.reverted;

  const vaultAfter = await depositVaultWithMorpho.morphoVaults(token);
  expect(vaultAfter).eq('0x0000000000000000000000000000000000000000');
};

export const depositInstantWithMorphoTest = async (
  {
    depositVaultWithMorpho,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    morphoVaultMock,
    waivedFee,
    minAmount,
    customRecipient,
    expectedMorphoDeposited = true,
  }: CommonParamsDeposit & {
    expectedMorphoDeposited?: boolean;
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
        depositVault: depositVaultWithMorpho,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
        checkTokensReceiver: !expectedMorphoDeposited,
      },
      tokenIn,
      amountUsdIn,
      opt,
    );
    return;
  }

  const tokensReceiver = await depositVaultWithMorpho.tokensReceiver();
  const morphoEnabledBefore =
    await depositVaultWithMorpho.morphoDepositsEnabled();

  const morphoSharesReceiverBefore = await balanceOfBase18(
    ERC20__factory.connect(morphoVaultMock.address, owner),
    tokensReceiver,
  );

  await depositInstantTest(
    {
      depositVault: depositVaultWithMorpho,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
      checkTokensReceiver: !expectedMorphoDeposited,
    },
    tokenIn,
    amountUsdIn,
    opt,
  );

  const morphoEnabledAfter =
    await depositVaultWithMorpho.morphoDepositsEnabled();
  expect(morphoEnabledAfter).eq(morphoEnabledBefore);

  if (morphoEnabledAfter && expectedMorphoDeposited) {
    const morphoSharesReceiverAfter = await balanceOfBase18(
      ERC20__factory.connect(morphoVaultMock.address, owner),
      tokensReceiver,
    );
    const sharesReceived = morphoSharesReceiverAfter.sub(
      morphoSharesReceiverBefore,
    );
    expect(sharesReceived).to.be.gt(0);
  }
};

export const setAutoInvestFallbackEnabledMorphoTest = async (
  { depositVaultWithMorpho, owner }: CommonParamsSetMorphoDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithMorpho
        .connect(opt?.from ?? owner)
        .setAutoInvestFallbackEnabled(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithMorpho
      .connect(opt?.from ?? owner)
      .setAutoInvestFallbackEnabled(enabled),
  ).to.emit(
    depositVaultWithMorpho,
    depositVaultWithMorpho.interface.events[
      'SetAutoInvestFallbackEnabled(bool)'
    ].name,
  ).to.not.reverted;

  const fallbackEnabledAfter =
    await depositVaultWithMorpho.autoInvestFallbackEnabled();
  expect(fallbackEnabledAfter).eq(enabled);
};

export const depositRequestWithMorphoTest = async (
  {
    depositVaultWithMorpho,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    morphoVaultMock,
    waivedFee,
    customRecipient,
    expectedMorphoDeposited = true,
  }: CommonParamsDeposit & {
    expectedMorphoDeposited?: boolean;
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
        depositVault: depositVaultWithMorpho,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        customRecipient,
        checkTokensReceiver: !expectedMorphoDeposited,
      },
      tokenIn,
      amountUsdIn,
      opt,
    );
    return {};
  }

  const tokensReceiver = await depositVaultWithMorpho.tokensReceiver();
  const morphoEnabledBefore =
    await depositVaultWithMorpho.morphoDepositsEnabled();

  const morphoSharesReceiverBefore = await balanceOfBase18(
    ERC20__factory.connect(morphoVaultMock.address, owner),
    tokensReceiver,
  );

  const result = await depositRequestTest(
    {
      depositVault: depositVaultWithMorpho,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      customRecipient,
      checkTokensReceiver: !expectedMorphoDeposited,
    },
    tokenIn,
    amountUsdIn,
    opt,
  );

  const morphoEnabledAfter =
    await depositVaultWithMorpho.morphoDepositsEnabled();
  expect(morphoEnabledAfter).eq(morphoEnabledBefore);

  if (morphoEnabledAfter && expectedMorphoDeposited) {
    const morphoSharesReceiverAfter = await balanceOfBase18(
      ERC20__factory.connect(morphoVaultMock.address, owner),
      tokensReceiver,
    );
    const sharesReceived = morphoSharesReceiverAfter.sub(
      morphoSharesReceiverBefore,
    );
    expect(sharesReceived).to.be.gt(0);
  }

  return result;
};
