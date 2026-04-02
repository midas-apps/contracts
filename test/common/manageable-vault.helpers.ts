import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { getAccount, OptionalCommonParams } from './common.helpers';
import { defaultDeploy } from './fixtures';

import {
  DepositVault,
  DepositVaultWithAave,
  DepositVaultWithMorpho,
  DepositVaultWithMToken,
  DepositVaultWithUSTB,
  ERC20,
  ERC20__factory,
  IERC20,
  ManageableVault,
  RedemptionVault,
  RedemptionVaultWithAave,
  RedemptionVaultWithMorpho,
  RedemptionVaultWithMToken,
  RedemptionVaultWithSwapper,
  RedemptionVaultWithUSTB,
} from '../../typechain-types';

type CommonParamsChangePaymentToken = {
  vault:
    | DepositVault
    | DepositVaultWithAave
    | DepositVaultWithMorpho
    | DepositVaultWithMToken
    | DepositVaultWithUSTB
    | RedemptionVault
    | RedemptionVaultWithAave
    | RedemptionVaultWithMorpho
    | RedemptionVaultWithMToken
    | RedemptionVaultWithSwapper
    | RedemptionVaultWithUSTB;
  owner: SignerWithAddress;
};
type CommonParams = {
  depositVault:
    | DepositVault
    | DepositVaultWithAave
    | DepositVaultWithMorpho
    | DepositVaultWithMToken
    | DepositVaultWithUSTB;
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

export const setMinMaxInstantFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newMinInstantFee: BigNumberish,
  newMaxInstantFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .setMinMaxInstantFee(newMinInstantFee, newMaxInstantFee),
    ).revertedWith(opt.revertMessage);
    return;
  }

  await expect(
    vault
      .connect(opt?.from ?? owner)
      .setMinMaxInstantFee(newMinInstantFee, newMaxInstantFee),
  )
    .to.emit(
      vault,
      vault.interface.events['SetMinMaxInstantFee(address,uint64,uint64)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newMinInstantFee, newMaxInstantFee)
    .to.not.reverted;

  expect(await vault.minInstantFee()).eq(newMinInstantFee);
  expect(await vault.maxInstantFee()).eq(newMaxInstantFee);
};

export const setWithdrawTokensReceiverTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newReceiver: string,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).setWithdrawTokensReceiver(newReceiver),
    ).revertedWith(opt.revertMessage);
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setWithdrawTokensReceiver(newReceiver),
  )
    .to.emit(
      vault,
      vault.interface.events['SetWithdrawTokensReceiver(address,address)'].name,
    )
    .withArgs((opt?.from ?? owner).address, newReceiver).to.not.reverted;

  expect(await vault.withdrawTokensReceiver()).eq(newReceiver);
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

export const setInstantLimitConfigTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newLimit: BigNumberish | { window: BigNumberish; limit: BigNumberish },
  opt?: OptionalCommonParams,
) => {
  const { window, limit: newLimitValue } =
    typeof newLimit === 'object' && 'window' in newLimit
      ? { window: newLimit.window, limit: newLimit.limit }
      : { window: days(1), limit: newLimit };

  if (opt?.revertMessage) {
    await expect(
      vault
        .connect(opt?.from ?? owner)
        .setInstantLimitConfig(window, newLimitValue),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const limitConfigsBefore = await vault.getLimitConfigs();

  await expect(
    vault
      .connect(opt?.from ?? owner)
      .setInstantLimitConfig(window, newLimitValue),
  )
    .to.emit(
      vault,
      vault.interface.events['SetInstantLimitConfig(address,uint256,uint256)']
        .name,
    )
    .withArgs((opt?.from ?? owner).address, window, newLimitValue).to.not
    .reverted;

  const limitConfigsAfter = await vault.getLimitConfigs();

  const configBefore = limitConfigsBefore.windows
    .map((w, i) => ({ window: w, config: limitConfigsBefore.configs[i] }))
    .filter((w) => w.window.eq(window))?.[0];

  const configAfter = limitConfigsAfter.windows
    .map((w, i) => ({ window: w, config: limitConfigsAfter.configs[i] }))
    .filter((w) => w.window.eq(window))?.[0];

  if (configBefore) {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).not.eq(undefined);
    expect(configAfter.config.limit).eq(newLimitValue);
    expect(configAfter.config.limitUsed).eq(configBefore.config.limitUsed);
    expect(configAfter.config.lastEpoch).eq(configBefore.config.lastEpoch);
  } else {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).eq(undefined);
    expect(configAfter.config.limit).eq(newLimitValue);
    expect(configAfter.config.limitUsed).eq(0);
    expect(configAfter.config.lastEpoch).eq(0);
  }
};

export const removeInstantLimitConfigTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  window: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).removeInstantLimitConfig(window),
    ).revertedWith(opt.revertMessage);
    return;
  }

  const limitConfigsBefore = await vault.getLimitConfigs();
  const indexBefore = limitConfigsBefore.windows.findIndex((w) => w.eq(window));
  expect(indexBefore).gte(
    0,
    'removeInstantLimitConfigTest: window must exist before removal',
  );

  await expect(
    vault.connect(opt?.from ?? owner).removeInstantLimitConfig(window),
  )
    .to.emit(
      vault,
      vault.interface.events['RemoveInstantLimitConfig(address,uint256)'].name,
    )
    .withArgs((opt?.from ?? owner).address, window).to.not.reverted;

  const limitConfigsAfter = await vault.getLimitConfigs();
  expect(limitConfigsAfter.windows.length).eq(
    limitConfigsBefore.windows.length - 1,
  );
  expect(limitConfigsAfter.windows.filter((w) => w.eq(window)).length).eq(0);
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
  { vault, owner }: { vault: ManageableVault; owner: SignerWithAddress },
  token: IERC20 | ERC20 | string,
  amount: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  token = getAccount(token);

  const tokenContract = ERC20__factory.connect(token, owner);

  if (opt?.revertMessage) {
    await expect(
      vault.connect(opt?.from ?? owner).withdrawToken(token, amount),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const withdrawTo = await vault.withdrawTokensReceiver();

  const balanceBeforeContract = await tokenContract.balanceOf(vault.address);
  const balanceBeforeTo = await tokenContract.balanceOf(withdrawTo);

  await expect(
    vault.connect(opt?.from ?? owner).withdrawToken(token, amount),
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
