import { expect } from 'chai';
import { BigNumberish } from 'ethers';

import {
  AccountOrContract,
  OptionalCommonParams,
  balanceOfBase18,
  getAccount,
} from './common.helpers';
import { depositInstantTest } from './deposit-vault.helpers';
import { defaultDeploy } from './fixtures';

import {
  AaveV3PoolMock,
  ERC20,
  ERC20__factory,
  IERC20Metadata,
} from '../../typechain-types';

type CommonParamsDeposit = {
  aavePoolMock: AaveV3PoolMock;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithAave' | 'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
>;

type CommonParamsSetAaveDepositsEnabled = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithAave' | 'owner'
>;

type CommonParamsSetAavePool = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithAave' | 'owner'
>;

export const setAaveDepositsEnabledTest = async (
  { depositVaultWithAave, owner }: CommonParamsSetAaveDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithAave
        .connect(opt?.from ?? owner)
        .setAaveDepositsEnabled(enabled),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithAave
      .connect(opt?.from ?? owner)
      .setAaveDepositsEnabled(enabled),
  ).to.emit(
    depositVaultWithAave,
    depositVaultWithAave.interface.events['SetAaveDepositsEnabled(bool)'].name,
  ).to.not.reverted;

  const aaveEnabledAfter = await depositVaultWithAave.aaveDepositsEnabled();
  expect(aaveEnabledAfter).eq(enabled);
};

export const setAavePoolTest = async (
  { depositVaultWithAave, owner }: CommonParamsSetAavePool,
  newPool: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      depositVaultWithAave.connect(opt?.from ?? owner).setAavePool(newPool),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVaultWithAave.connect(opt?.from ?? owner).setAavePool(newPool),
  ).to.emit(
    depositVaultWithAave,
    depositVaultWithAave.interface.events['SetAavePool(address,address)'].name,
  ).to.not.reverted;

  const poolAfter = await depositVaultWithAave.aavePool();
  expect(poolAfter).eq(newPool);
};

export const depositInstantWithAaveTest = async (
  {
    depositVaultWithAave,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    aavePoolMock,
    waivedFee,
    minAmount,
    customRecipient,
    expectedAaveDeposited = true,
  }: CommonParamsDeposit & {
    expectedAaveDeposited?: boolean;
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
        depositVault: depositVaultWithAave,
        owner,
        mTBILL,
        mTokenToUsdDataFeed,
        waivedFee,
        minAmount,
        customRecipient,
        checkTokensReceiver: !expectedAaveDeposited,
      },
      tokenIn,
      amountUsdIn,
      opt,
    );
    return;
  }

  const tokensReceiver = await depositVaultWithAave.tokensReceiver();
  const aaveEnabledBefore = await depositVaultWithAave.aaveDepositsEnabled();

  const aTokenAddress = await aavePoolMock.getReserveAToken(tokenIn);
  const aTokenContract = ERC20__factory.connect(aTokenAddress, owner);

  const aTokenReceiverBalanceBefore = await balanceOfBase18(
    aTokenContract,
    tokensReceiver,
  );

  await depositInstantTest(
    {
      depositVault: depositVaultWithAave,
      owner,
      mTBILL,
      mTokenToUsdDataFeed,
      waivedFee,
      minAmount,
      customRecipient,
      checkTokensReceiver: !expectedAaveDeposited,
    },
    tokenIn,
    amountUsdIn,
    opt,
  );

  const aaveEnabledAfter = await depositVaultWithAave.aaveDepositsEnabled();
  expect(aaveEnabledAfter).eq(aaveEnabledBefore);

  if (aaveEnabledAfter && expectedAaveDeposited) {
    const aTokenReceiverBalanceAfter = await balanceOfBase18(
      aTokenContract,
      tokensReceiver,
    );
    const aTokenReceived = aTokenReceiverBalanceAfter.sub(
      aTokenReceiverBalanceBefore,
    );
    expect(aTokenReceived).to.be.gt(0);
  }
};
