import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';

import {
  AccountOrContract,
  OptionalCommonParams,
  getAccount,
  handleRevert,
  shouldRevert,
} from './common.helpers';
import { depositInstantTest } from './deposit-vault.helpers';
import { defaultDeploy } from './fixtures';

import {
  ERC20,
  IERC20Metadata,
  ISuperstateToken,
  USTBMock,
} from '../../typechain-types';

type CommonParamsDeposit = {
  ustbToken: ISuperstateToken | USTBMock;
} & Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithUSTB' | 'owner' | 'mTBILL' | 'mTokenToUsdDataFeed'
>;

type CommonParamsSetUstbDepositsEnabled = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'depositVaultWithUSTB' | 'owner'
>;

export const setMockUstbStablecoinConfig = async (
  { ustbToken }: { ustbToken: USTBMock | ISuperstateToken },
  stablecoin: AccountOrContract,
  config: ISuperstateToken.StablecoinConfigStruct = {
    fee: BigNumber.from(0),
    sweepDestination: ustbToken.address,
  },
  opt?: OptionalCommonParams,
) => {
  stablecoin = getAccount(stablecoin);

  if (opt?.from) {
    ustbToken = ustbToken.connect(opt.from);
  }

  await expect(
    ustbToken.setStablecoinConfig(
      stablecoin,
      config.sweepDestination,
      config.fee,
    ),
  ).to.not.reverted;
};

export const setUstbDepositsEnabledTest = async (
  { depositVaultWithUSTB, owner }: CommonParamsSetUstbDepositsEnabled,
  enabled: boolean,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      depositVaultWithUSTB
        .connect(opt?.from ?? owner)
        .setUstbDepositsEnabled.bind(this, enabled),
      depositVaultWithUSTB,
      opt,
    )
  ) {
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
    expectedUstbMinted,
  }: CommonParamsDeposit & {
    expectedUstbDeposited?: boolean;
    waivedFee?: boolean;
    minAmount?: BigNumberish;
    customRecipient?: AccountOrContract;
    expectedUstbMinted?: BigNumberish;
  },
  tokenIn: ERC20 | IERC20Metadata | string,
  amountUsdIn: number,
  opt?: OptionalCommonParams,
) => {
  tokenIn = getAccount(tokenIn);

  if (shouldRevert(opt)) {
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

  const tokensReceiver = await depositVaultWithUSTB.tokensReceiver();
  const ustbEnabledBefore = await depositVaultWithUSTB.ustbDepositsEnabled();
  const ustbSupplyBefore = await ustbToken.totalSupply();
  const ustbReceiverBalanceBefore = await ustbToken.balanceOf(tokensReceiver);

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
    const ustbMinted = ustbSupplyAfter.sub(ustbSupplyBefore);
    const ustbReceived = ustbReceiverBalanceAfter.sub(
      ustbReceiverBalanceBefore,
    );

    if (expectedUstbMinted !== undefined) {
      expect(ustbMinted).eq(expectedUstbMinted);
      expect(ustbReceived).eq(expectedUstbMinted);
    } else {
      expect(ustbMinted).to.be.gt(0);
      expect(ustbReceived).eq(ustbMinted);
    }
  }
};
