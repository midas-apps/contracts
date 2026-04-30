import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';

import {
  AccountOrContract,
  handleRevert,
  OptionalCommonParams,
  shouldRevert,
} from './common.helpers';
import { redeemInstantTest } from './redemption-vault.helpers';

import {
  IERC20,
  RedemptionVaultWithMorpho,
  MTBILLTest,
  DataFeedTest,
} from '../../typechain-types';

type CommonParamsSetMorphoVault = {
  redemptionVault: RedemptionVaultWithMorpho;
  owner: SignerWithAddress;
};

type RedemptionWithMorphoParams = {
  redemptionVault: RedemptionVaultWithMorpho;
  owner: SignerWithAddress;
  mTBILL: MTBILLTest;
  mTokenToUsdDataFeed: DataFeedTest;
  usdc: IERC20;
  morphoVault: IERC20;
  waivedFee?: boolean;
  minAmount?: BigNumberish;
  expectedSharesUsed?: BigNumber;
  expectedUsdcUsed?: BigNumber;
  customRecipient?: AccountOrContract;
};

export const setMorphoVaultTest = async (
  { redemptionVault, owner }: CommonParamsSetMorphoVault,
  token: string,
  vault: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      redemptionVault
        .connect(opt?.from ?? owner)
        .setMorphoVault.bind(this, token, vault),
      redemptionVault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).setMorphoVault(token, vault),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['SetMorphoVault(address,address,address)']
      .name,
  ).to.not.reverted;

  const vaultAfter = await redemptionVault.morphoVaults(token);
  expect(vaultAfter).eq(vault);
};

export const removeMorphoVaultTest = async (
  { redemptionVault, owner }: CommonParamsSetMorphoVault,
  token: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      redemptionVault
        .connect(opt?.from ?? owner)
        .removeMorphoVault.bind(this, token),
      redemptionVault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    redemptionVault.connect(opt?.from ?? owner).removeMorphoVault(token),
  ).to.emit(
    redemptionVault,
    redemptionVault.interface.events['RemoveMorphoVault(address,address)'].name,
  ).to.not.reverted;

  const vaultAfter = await redemptionVault.morphoVaults(token);
  expect(vaultAfter).eq('0x0000000000000000000000000000000000000000');
};

export const redeemInstantWithMorphoTest = async (
  params: RedemptionWithMorphoParams,
  amountTBillIn: number,
  opt?: OptionalCommonParams,
) => {
  const {
    redemptionVault,
    owner,
    mTBILL,
    mTokenToUsdDataFeed,
    usdc,
    morphoVault,
    expectedSharesUsed,
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
  const [vaultUSDCBefore, vaultSharesBefore, userUSDCBefore] =
    await Promise.all([
      usdc.balanceOf(redemptionVault.address),
      morphoVault.balanceOf(redemptionVault.address),
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

  const [vaultUSDCAfter, vaultSharesAfter, userUSDCAfter] = await Promise.all([
    usdc.balanceOf(redemptionVault.address),
    morphoVault.balanceOf(redemptionVault.address),
    usdc.balanceOf(sender.address),
  ]);

  const usdcUsed = vaultUSDCBefore.sub(vaultUSDCAfter);
  const sharesUsed = vaultSharesBefore.sub(vaultSharesAfter);

  if (expectedSharesUsed !== undefined) {
    expect(sharesUsed).to.equal(expectedSharesUsed);
  }
  if (expectedUsdcUsed !== undefined) {
    expect(usdcUsed).to.equal(expectedUsdcUsed);
  }

  return {
    usdcUsed,
    sharesUsed,
    userUSDCReceived: userUSDCAfter.sub(userUSDCBefore),
    vaultUSDCBefore,
    vaultUSDCAfter,
    vaultSharesBefore,
    vaultSharesAfter,
  };
};
