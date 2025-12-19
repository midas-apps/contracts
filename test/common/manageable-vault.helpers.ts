import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  DepositVault,
  DepositVaultWithUSTB,
  ERC20,
  ERC20__factory,
  IERC20,
  RedemptionVault,
  RedemptionVaultWIthBUIDL,
  RedemptionVaultWithSwapper,
  RedemptionVaultWithUSTB,
} from '../../typechain-types';

type CommonParamsChangePaymentToken = {
  vault:
    | DepositVault
    | DepositVaultWithUSTB
    | RedemptionVault
    | RedemptionVaultWIthBUIDL
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB;
  owner: SignerWithAddress;
};
type CommonParams = {
  depositVault: DepositVault | DepositVaultWithUSTB;
} & Pick<Awaited<ReturnType<typeof defaultDeploy>>, 'owner'>;

export const setInstantFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setInstantFee(newFee),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setInstantFee(newFee))
    .to.emit(
      vault,
      vault.interface.events['SetInstantFee(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newFee).to.not.reverted;

  const fee = await vault.instantFee();
  expect(fee).eq(newFee);
};

export const setVariabilityToleranceTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newTolerance: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setVariationTolerance(newTolerance),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setVariationTolerance(newTolerance),
  )
    .to.emit(
      vault,
      vault.interface.events['SetVariationTolerance(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newTolerance).to.not.reverted;

  const tolerance = await vault.variationTolerance();
  expect(tolerance).eq(newTolerance);
};

export const addWaivedFeeAccountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account))
    .to.emit(
      vault,
      vault.interface.events['AddWaivedFeeAccount(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, account).to.not.reverted;

  const isWaivedFee = await vault.waivedFeeRestriction(account);
  expect(isWaivedFee).eq(true);
};

export const changeTokenAllowanceTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: string,
  newAllowance: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .changeTokenAllowance(token, newAllowance),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).changeTokenAllowance(token, newAllowance),
  )
    .to.emit(
      vault,
      vault.interface.events['ChangeTokenAllowance(address,address,uint256)']
        .name,
    )
    .withArgs((opt?.from ?? owner).address, token).to.not.reverted;

  const allowance = (await vault.tokensConfig(token)).allowance;
  expect(allowance).eq(newAllowance);
};

export const changeTokenFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: string,
  newFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).changeTokenFee(token, newFee),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).changeTokenFee(token, newFee))
    .to.emit(
      vault,
      vault.interface.events['ChangeTokenFee(address,address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, token, newFee).to.not.reverted;

  const fee = (await vault.tokensConfig(token)).fee;
  expect(fee).eq(newFee);
};

export const removeWaivedFeeAccountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).removeWaivedFeeAccount(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).removeWaivedFeeAccount(account),
  )
    .to.emit(
      vault,
      vault.interface.events['RemoveWaivedFeeAccount(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, account).to.not.reverted;

  const isWaivedFee = await vault.waivedFeeRestriction(account);
  expect(isWaivedFee).eq(false);
};

export const setInstantDailyLimitTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newLimit: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setInstantDailyLimit(newLimit),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setInstantDailyLimit(newLimit))
    .to.emit(
      vault,
      vault.interface.events['SetInstantDailyLimit(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newLimit).to.not.reverted;

  const limit = await vault.instantDailyLimit();
  expect(limit).eq(newLimit);
};

export const setFeeReceiverTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newReceiver: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setFeeReceiver(newReceiver),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setFeeReceiver(newReceiver))
    .to.emit(
      vault,
      vault.interface.events['SetFeeReceiver(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newReceiver).to.not.reverted;

  const feeReceiver = await vault.feeReceiver();
  expect(feeReceiver).eq(newReceiver);
};

export const setTokensReceiverTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newReceiver: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setTokensReceiver(newReceiver),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setTokensReceiver(newReceiver))
    .to.emit(
      vault,
      vault.interface.events['SetTokensReceiver(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newReceiver).to.not.reverted;

  const feeReceiver = await vault.tokensReceiver();
  expect(feeReceiver).eq(newReceiver);
};

export const addAccountWaivedFeeRestrictionTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account))
    .to.emit(
      vault,
      vault.interface.events['AddWaivedFeeAccount(address,address)'].name,
    )
    .withArgs(account, (opt?.from ?? owner).address).to.not.reverted;
};

export const setMinAmountToDepositTest = async (
  { depositVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      depositVault
        .connect(opt?.from ?? owner)
        .setMinMTokenAmountForFirstDeposit(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    depositVault
      .connect(opt?.from ?? owner)
      .setMinMTokenAmountForFirstDeposit(value),
  ).to.emit(
    depositVault,
    depositVault.interface.events[
      'SetMinMTokenAmountForFirstDeposit(address,uint256)'
    ].name,
  ).to.not.reverted;

  const newMin = await depositVault.minMTokenAmountForFirstDeposit();
  expect(newMin).eq(value);
};

export const setMinAmountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setMinAmount(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setMinAmount(value)).to.emit(
    vault,
    vault.interface.events['SetMinAmount(address,uint256)'].name,
  ).to.not.reverted;

  const newMin = await vault.minAmount();
  expect(newMin).eq(value);
};

export const addPaymentTokenTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: ERC20 | string,
  dataFeed: string,
  fee: BigNumberish,
  isStable: boolean,
  allowance: BigNumberish = constants.MaxUint256,
  opt?: OptionalCommonParams,
) => {
  token = (token as ERC20).address ?? (token as string);

  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .addPaymentToken(token, dataFeed, fee, allowance, isStable),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault
      .connect(opt?.from ?? owner)
      .addPaymentToken(token, dataFeed, fee, allowance, isStable),
  ).to.emit(
    vault,
    vault.interface.events[
      'AddPaymentToken(address,address,address,uint256,uint256,bool)'
    ].name,
  ).to.not.reverted;

  const paymentTokens = await vault.getPaymentTokens();
  expect(paymentTokens.find((v) => v === token)).not.eq(undefined);
  const tokenConfig = await vault.tokensConfig(token);
  expect(tokenConfig.dataFeed).eq(dataFeed);
  expect(tokenConfig.fee).eq(fee);
  expect(tokenConfig.allowance).eq(allowance);
};

export const removePaymentTokenTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: ERC20 | string,
  opt?: OptionalCommonParams,
) => {
  token = (token as ERC20).address ?? (token as string);

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).removePaymentToken(token),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).removePaymentToken(token),
  ).to.emit(
    vault,
    vault.interface.events['RemovePaymentToken(address,address)'].name,
  ).to.not.reverted;

  const paymentTokens = await vault.getPaymentTokens();
  expect(paymentTokens.find((v) => v === token)).eq(undefined);
};

export const withdrawTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: IERC20 | ERC20 | string,
  amount: BigNumberish,
  withdrawTo: Account,
  opt?: OptionalCommonParams,
) => {
  withdrawTo = getAccount(withdrawTo);
  token = getAccount(token);

  const tokenContract = ERC20__factory.connect(token, owner);

  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .withdrawToken(token, amount, withdrawTo),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceBeforeContract = await tokenContract.balanceOf(vault.address);
  const balanceBeforeTo = await tokenContract.balanceOf(withdrawTo);

  await expect(
    vault.connect(opt?.from ?? owner).withdrawToken(token, amount, withdrawTo),
  ).to.emit(
    vault,
    vault.interface.events['WithdrawToken(address,address,address,uint256)']
      .name,
  ).to.not.reverted;

  const balanceAfterContract = await tokenContract.balanceOf(vault.address);
  const balanceAfterTo = await tokenContract.balanceOf(withdrawTo);

  expect(balanceAfterContract).eq(balanceBeforeContract.sub(amount));
  expect(balanceAfterTo).eq(balanceBeforeTo.add(amount));
};

export const setMinBuidlToRedeem = async (
  {
    vault,
    owner,
  }: { vault: RedemptionVaultWIthBUIDL; owner: SignerWithAddress },
  value: BigNumber,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setMinBuidlToRedeem(value),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setMinBuidlToRedeem(value),
  ).to.emit(
    vault,
    vault.interface.events['SetMinBuidlToRedeem(uint256,address)'].name,
  ).to.not.reverted;

  const newMin = await vault.minBuidlToRedeem();
  expect(newMin).eq(value);
};
