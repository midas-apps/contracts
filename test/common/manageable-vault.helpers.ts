import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  getAccount,
  getCurrentBlockTimestamp,
  handleRevert,
  OptionalCommonParams,
} from './common.helpers';
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
    | RedemptionVaultWithUSTB
    | ManageableVault;
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

export type WindowRateLimitCapacityParams = {
  /** stored `amountInFlight` (not a pre-decayed view) */
  amountInFlight: BigNumberish;
  lastUpdated: BigNumberish;
  limit: BigNumberish;
  window: BigNumberish;
  /** current timestamp (`block.timestamp`) */
  now: BigNumberish;
};

export type WindowRateLimitCapacity = {
  inFlight: BigNumber;
  remaining: BigNumber;
};

/** `Math.mulDiv(a, b, c, Down)` — matches OpenZeppelin / `RateLimitLibrary`. */
export const mulDiv = (
  a: BigNumberish,
  b: BigNumberish,
  c: BigNumberish,
): BigNumber => {
  const denominator = BigNumber.from(c);
  if (denominator.isZero()) {
    return BigNumber.from(0);
  }
  return BigNumber.from(
    (BigInt(BigNumber.from(a).toString()) *
      BigInt(BigNumber.from(b).toString())) /
      BigInt(denominator.toString()),
  );
};

/**
 * Mirrors `RateLimitLibrary._availableCapacity` (decayed in-flight + headroom).
 */
export const calculateWindowRateLimitCapacity = ({
  amountInFlight,
  lastUpdated,
  limit,
  window,
  now,
}: WindowRateLimitCapacityParams): WindowRateLimitCapacity => {
  const elapsed = BigNumber.from(now).sub(lastUpdated);
  const windowBn = BigNumber.from(window);
  const divisor = windowBn.isZero() ? BigNumber.from(1) : windowBn;

  const decay = mulDiv(limit, elapsed, divisor);

  const amountInFlightBn = BigNumber.from(amountInFlight);
  const inFlight = amountInFlightBn.lte(decay)
    ? BigNumber.from(0)
    : amountInFlightBn.sub(decay);

  const limitBn = BigNumber.from(limit);
  const remaining = limitBn.lte(inFlight)
    ? BigNumber.from(0)
    : limitBn.sub(inFlight);

  return { inFlight, remaining };
};

export const setInstantFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).setInstantFee.bind(this, newFee),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setInstantFee(newFee))
    .to.emit(vault, vault.interface.events['SetInstantFee(uint256)'].name)
    .withArgs(newFee).to.not.reverted;

  const fee = await vault.instantFee();
  expect(fee).eq(newFee);
};

export const setMinMaxInstantFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newMinInstantFee: BigNumberish,
  newMaxInstantFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .setMinMaxInstantFee.bind(this, newMinInstantFee, newMaxInstantFee),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault
      .connect(opt?.from ?? owner)
      .setMinMaxInstantFee(newMinInstantFee, newMaxInstantFee),
  )
    .to.emit(
      vault,
      vault.interface.events['SetMinMaxInstantFee(uint64,uint64)'].name,
    )
    .withArgs(newMinInstantFee, newMaxInstantFee).to.not.reverted;

  expect(await vault.minInstantFee()).eq(newMinInstantFee);
  expect(await vault.maxInstantFee()).eq(newMaxInstantFee);
};

export const setVariabilityToleranceTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newTolerance: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .setVariationTolerance.bind(this, newTolerance),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setVariationTolerance(newTolerance),
  )
    .to.emit(
      vault,
      vault.interface.events['SetVariationTolerance(uint256)'].name,
    )
    .withArgs(newTolerance).to.not.reverted;

  const tolerance = await vault.variationTolerance();
  expect(tolerance).eq(newTolerance);
};

export const addWaivedFeeAccountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).addWaivedFeeAccount.bind(this, account),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account))
    .to.emit(vault, vault.interface.events['AddWaivedFeeAccount(address)'].name)
    .withArgs(account).to.not.reverted;

  const isWaivedFee = await vault.waivedFeeRestriction(account);
  expect(isWaivedFee).eq(true);
};

export const changeTokenAllowanceTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: string,
  newAllowance: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .changeTokenAllowance.bind(this, token, newAllowance),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).changeTokenAllowance(token, newAllowance),
  )
    .to.emit(
      vault,
      vault.interface.events['ChangeTokenAllowance(address,uint256)'].name,
    )
    .withArgs(token).to.not.reverted;

  const allowance = (await vault.tokensConfig(token)).allowance;
  expect(allowance).eq(newAllowance);
};

export const changeTokenFeeTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  token: string,
  newFee: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .changeTokenFee.bind(this, token, newFee),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).changeTokenFee(token, newFee))
    .to.emit(
      vault,
      vault.interface.events['ChangeTokenFee(address,uint256)'].name,
    )
    .withArgs(token, newFee).to.not.reverted;

  const fee = (await vault.tokensConfig(token)).fee;
  expect(fee).eq(newFee);
};

export const removeWaivedFeeAccountTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .removeWaivedFeeAccount.bind(this, account),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).removeWaivedFeeAccount(account),
  )
    .to.emit(
      vault,
      vault.interface.events['RemoveWaivedFeeAccount(address)'].name,
    )
    .withArgs(account).to.not.reverted;

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

  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .setInstantLimitConfig.bind(this, window, newLimitValue),
      vault,
      opt,
    )
  ) {
    return;
  }

  const limitConfigsBefore = await vault.getInstantLimitStatuses();

  // TODO: check events
  await expect(
    vault
      .connect(opt?.from ?? owner)
      .setInstantLimitConfig(window, newLimitValue),
  ).not.reverted;

  const limitConfigsAfter = await vault.getInstantLimitStatuses();

  const configBefore = limitConfigsBefore.filter((w) =>
    w.window.eq(window),
  )?.[0];

  const configAfter = limitConfigsAfter.filter((w) => w.window.eq(window))?.[0];

  const currentTimestamp = await getCurrentBlockTimestamp();

  if (configBefore) {
    const { inFlight, remaining } = calculateWindowRateLimitCapacity({
      amountInFlight: configBefore.inFlight,
      lastUpdated: configBefore.lastUpdated,
      limit: newLimitValue,
      window,
      now: currentTimestamp,
    });

    expect(configAfter).not.eq(undefined);
    expect(configBefore).not.eq(undefined);
    expect(configAfter.limit).eq(newLimitValue);
    expect(configAfter.lastUpdated).eq(currentTimestamp);
    expect(configAfter.inFlight).eq(inFlight);
    expect(configAfter.remaining).eq(remaining);
  } else {
    expect(configAfter).not.eq(undefined);
    expect(configBefore).eq(undefined);
    expect(configAfter.limit).eq(newLimitValue);
    expect(configAfter.inFlight).eq(0);
    expect(configAfter.lastUpdated).eq(currentTimestamp);
    expect(configAfter.remaining).eq(newLimitValue);
  }
};

export const removeInstantLimitConfigTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  window: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .removeInstantLimitConfig.bind(this, window),
      vault,
      opt,
    )
  ) {
    return;
  }

  const limitConfigsBefore = await vault.getInstantLimitStatuses();
  const indexBefore = limitConfigsBefore.findIndex((w) => w.window.eq(window));
  expect(indexBefore).gte(
    0,
    'removeInstantLimitConfigTest: window must exist before removal',
  );

  // TODO: check events
  await expect(
    vault.connect(opt?.from ?? owner).removeInstantLimitConfig(window),
  ).to.not.reverted;

  const limitConfigsAfter = await vault.getInstantLimitStatuses();
  expect(limitConfigsAfter.length).eq(limitConfigsBefore.length - 1);
  expect(limitConfigsAfter.filter((w) => w.window.eq(window)).length).eq(0);
};

export const setMaxInstantShareTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  maxInstantShare: number,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .setMaxInstantShare.bind(this, maxInstantShare),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setMaxInstantShare(maxInstantShare),
  ).to.emit(vault, vault.interface.events['SetMaxInstantShare(uint64)'].name).to
    .not.reverted;

  const newMaxInstantShare = await vault.maxInstantShare();
  expect(newMaxInstantShare).eq(maxInstantShare);
};

export const setTokensReceiverTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  newReceiver: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .setTokensReceiver.bind(this, newReceiver),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setTokensReceiver(newReceiver))
    .to.emit(vault, vault.interface.events['SetTokensReceiver(address)'].name)
    .withArgs(newReceiver).to.not.reverted;

  const feeReceiver = await vault.tokensReceiver();
  expect(feeReceiver).eq(newReceiver);
};

export const addAccountWaivedFeeRestrictionTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  account: string,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).addWaivedFeeAccount.bind(this, account),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).addWaivedFeeAccount(account))
    .to.emit(vault, vault.interface.events['AddWaivedFeeAccount(address)'].name)
    .withArgs(account).to.not.reverted;
};

export const setSequentialRequestProcessingTest = async (
  { vault, owner }: CommonParamsChangePaymentToken,
  value: boolean,
  opt?: OptionalCommonParams,
) => {
  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .setSequentialRequestProcessing.bind(this, value),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).setSequentialRequestProcessing(value),
  )
    .to.emit(
      vault,
      vault.interface.events['SetSequentialRequestProcessing(bool)'].name,
    )
    .withArgs(value).to.not.reverted;

  const newSequentialRequestProcessing =
    await vault.sequentialRequestProcessing();

  expect(newSequentialRequestProcessing).eq(value);
};

export const setMinAmountToDepositTest = async (
  { depositVault, owner }: CommonParams,
  valueN: number,
  opt?: OptionalCommonParams,
) => {
  const value = parseUnits(valueN.toString());

  if (
    await handleRevert(
      depositVault
        .connect(opt?.from ?? owner)
        .setMinMTokenAmountForFirstDeposit.bind(this, value),
      depositVault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    depositVault
      .connect(opt?.from ?? owner)
      .setMinMTokenAmountForFirstDeposit(value),
  ).to.emit(
    depositVault,
    depositVault.interface.events['SetMinMTokenAmountForFirstDeposit(uint256)']
      .name,
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

  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).setMinAmount.bind(this, value),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(vault.connect(opt?.from ?? owner).setMinAmount(value)).to.emit(
    vault,
    vault.interface.events['SetMinAmount(uint256)'].name,
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

  if (
    await handleRevert(
      vault
        .connect(opt?.from ?? owner)
        .addPaymentToken.bind(this, token, dataFeed, fee, allowance, isStable),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault
      .connect(opt?.from ?? owner)
      .addPaymentToken(token, dataFeed, fee, allowance, isStable),
  ).to.emit(
    vault,
    vault.interface.events[
      'AddPaymentToken(address,address,uint256,uint256,bool)'
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

  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).removePaymentToken.bind(this, token),
      vault,
      opt,
    )
  ) {
    return;
  }

  await expect(
    vault.connect(opt?.from ?? owner).removePaymentToken(token),
  ).to.emit(vault, vault.interface.events['RemovePaymentToken(address)'].name)
    .to.not.reverted;

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

  if (
    await handleRevert(
      vault.connect(opt?.from ?? owner).withdrawToken.bind(this, token, amount),
      vault,
      opt,
    )
  ) {
    return;
  }

  const withdrawTo = await vault.tokensReceiver();

  const balanceBeforeContract = await tokenContract.balanceOf(vault.address);
  const balanceBeforeTo = await tokenContract.balanceOf(withdrawTo);

  await expect(
    vault.connect(opt?.from ?? owner).withdrawToken(token, amount),
  ).to.emit(
    vault,
    vault.interface.events['WithdrawToken(address,address,uint256)'].name,
  ).to.not.reverted;

  const balanceAfterContract = await tokenContract.balanceOf(vault.address);
  const balanceAfterTo = await tokenContract.balanceOf(withdrawTo);

  expect(balanceAfterContract).eq(balanceBeforeContract.sub(amount));
  expect(balanceAfterTo).eq(balanceBeforeTo.add(amount));
};
