import { expect } from 'chai';
import { BigNumberish, constants, Contract } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { OptionalCommonParams, tokenAmountToBase18 } from './common.helpers';
import { calcExpectedMintAmount } from './deposit-vault.helpers';
import { axelarFixture } from './fixtures';
import { calcExpectedTokenOutAmount } from './redemption-vault.helpers';

import {
  DepositVault__factory,
  ERC20__factory,
  RedemptionVault__factory,
} from '../../typechain-types';

type CommonParams = Pick<
  Awaited<ReturnType<typeof axelarFixture>>,
  | 'axelarItsA'
  | 'axelarItsB'
  | 'executor'
  | 'chainNameHashA'
  | 'chainNameHashB'
  | 'chainNameA'
  | 'chainNameB'
  | 'mTokenId'
  | 'owner'
  | 'mTBILL'
  | 'mTokenToUsdDataFeed'
  | 'paymentTokenId'
>;

export const sendIts = async (
  {
    mTBILL,
    axelarItsA,
    axelarItsB,
    mTokenId,
    chainNameA,
    chainNameB,
    owner,
  }: CommonParams,
  {
    direction,
    amount,
    recipient,
  }: {
    direction?: 'A_TO_B' | 'B_TO_A';
    amount?: number;
    recipient?: string;
  },
  opt?: {
    revertOnDst?: boolean;
    revertWithCustomError?: {
      contract: Contract;
      error: string;
    };
  } & OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  direction ??= 'A_TO_B';
  recipient ??= from.address;

  amount ??= 100;

  const amountParsed = parseUnits(amount.toFixed(18).replace(/\.?0+$/, ''));

  const oneSD = parseUnits('1', 9);

  const dust = amountParsed.sub(amountParsed.div(oneSD).mul(oneSD));
  const amountWoDust = amountParsed.sub(dust);

  const itsFrom = direction === 'A_TO_B' ? axelarItsA : axelarItsB;

  const params = [
    mTokenId,
    direction === 'A_TO_B' ? chainNameB : chainNameA,
    recipient,
    amountParsed,
  ] as const;

  if (opt?.revertMessage && !opt?.revertOnDst) {
    await expect(
      itsFrom.connect(opt?.from ?? owner).interchainTransfer(...params),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError && !opt?.revertOnDst) {
    await expect(
      itsFrom.connect(opt?.from ?? owner).interchainTransfer(...params),
    ).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await mTBILL.balanceOf(from.address);
  const balanceToBefore = await mTBILL.balanceOf(recipient);

  await expect(itsFrom.connect(from).interchainTransfer(...params)).not
    .reverted;

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceFromAfter = await mTBILL.balanceOf(from.address);
  const balanceToAfter = await mTBILL.balanceOf(recipient);

  // try/catch of mocked lz endpoint catches all the errors, so that is the only way
  // to check if the revert happened on the dst
  if (opt?.revertOnDst) {
    expect(totalSupplyAfter).lt(totalSupplyBefore);
    return;
  }

  expect(totalSupplyAfter).eq(totalSupplyBefore);

  if (from.address !== recipient) {
    expect(balanceFromAfter).eq(balanceFromBefore.sub(amountWoDust));
    expect(balanceToAfter).eq(balanceToBefore.add(amountWoDust));
  } else {
    expect(balanceFromAfter).eq(balanceFromBefore);
    expect(balanceToAfter).eq(balanceToBefore);
  }
};

export const depositAndSend = async (
  {
    executor,
    owner,
    paymentTokenId,
    mTokenId,
    axelarItsA,
    axelarItsB,
    chainNameA,
    chainNameB,
    mTBILL,
    mTokenToUsdDataFeed,
  }: CommonParams,
  {
    amount,
    recipient,
    direction,
    referrerId,
    minReceiveAmount,
  }: {
    amount: number;
    recipient?: string;
    direction?: 'A_TO_A' | 'A_TO_B';
    referrerId?: string;
    minReceiveAmount?: BigNumberish;
  },
  opt?: {
    revertWithCustomError?: {
      contract: Contract;
      error: string;
    };
  } & OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  recipient ??= from.address;
  direction ??= 'A_TO_A';

  amount ??= 100;

  const pToken = ERC20__factory.connect(
    await executor.paymentTokenErc20(),
    from,
  );

  const amountParsed = parseUnits(
    amount.toFixed(await executor.paymentTokenDecimals()).replace(/\.?0+$/, ''),
  );
  const amountParsedBase18 = parseUnits(
    amount.toFixed(18).replace(/\.?0+$/, ''),
  );
  referrerId ??= constants.HashZero;

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();
  const { mintAmount } = await calcExpectedMintAmount(
    from,
    await executor.paymentTokenErc20(),

    DepositVault__factory.connect(await executor.depositVault(), from),
    mTokenRate,
    amountParsedBase18,
    true,
  );

  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ['bytes', 'uint256', 'bytes32', 'string'],
    [
      recipient,
      minReceiveAmount ?? 0,
      referrerId,
      direction === 'A_TO_A' ? chainNameA : chainNameB,
    ],
  );
  const params = [amountParsed, encodedData] as const;

  if (opt?.revertMessage) {
    await expect(
      executor.connect(opt?.from ?? owner).depositAndSend(...params),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    await expect(
      executor.connect(opt?.from ?? owner).depositAndSend(...params),
    ).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await pToken.balanceOf(from.address);
  const balanceToBefore = await mTBILL.balanceOf(recipient);

  await expect(executor.connect(from).depositAndSend(...params))
    .to.emit(
      executor,
      executor.interface.events['Deposited(bytes,bytes,string,uint256,uint256)']
        .name,
    )
    .withArgs(
      ethers.utils.solidityPack(['address'], [from.address]),
      ethers.utils.solidityPack(['address'], [recipient]),
      direction === 'A_TO_A' ? chainNameA : chainNameB,
      amountParsed,
      mintAmount,
    );

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceFromAfter = await pToken.balanceOf(from.address);
  const balanceToAfter = await mTBILL.balanceOf(recipient);

  expect(totalSupplyAfter).eq(totalSupplyBefore.add(mintAmount));

  expect(balanceFromAfter).eq(balanceFromBefore.sub(amountParsed));
  expect(balanceToAfter).eq(balanceToBefore.add(mintAmount));
};

export const redeemAndSend = async (
  {
    executor,
    mTBILL,
    owner,
    chainNameA,
    chainNameB,
    mTokenToUsdDataFeed,
  }: CommonParams,
  {
    amount,
    recipient,
    direction,
    minReceiveAmount,
  }: {
    amount: number;
    recipient?: string;
    direction?: 'A_TO_A' | 'B_TO_B' | 'B_TO_A' | 'A_TO_B';
    minReceiveAmount?: BigNumberish;
  },
  opt?: {
    revertWithCustomError?: {
      contract: Contract;
      error: string;
    };
  } & OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  recipient ??= from.address;
  direction ??= 'A_TO_A';

  amount ??= 100;

  const pToken = ERC20__factory.connect(
    await executor.paymentTokenErc20(),
    from,
  );

  const amountParsed = parseUnits(amount.toFixed(18).replace(/\.?0+$/, ''));

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();
  const { amountOut } = await calcExpectedTokenOutAmount(
    from,
    pToken,

    RedemptionVault__factory.connect(await executor.redemptionVault(), from),
    mTokenRate,
    amountParsed,
    true,
  );

  const encodedData = ethers.utils.defaultAbiCoder.encode(
    ['bytes', 'uint256', 'string'],
    [
      recipient,
      minReceiveAmount ?? 0,
      direction === 'A_TO_A' ? chainNameA : chainNameB,
    ],
  );
  const params = [amountParsed, encodedData] as const;

  const txFn = executor.connect(from).redeemAndSend.bind(this, ...params);

  if (opt?.revertMessage) {
    await expect(txFn()).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError) {
    await expect(txFn()).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await mTBILL.balanceOf(from.address);
  const balanceToBefore = await pToken.balanceOf(recipient);

  await expect(txFn())
    .to.emit(
      executor,
      executor.interface.events['Redeemed(bytes,bytes,string,uint256,uint256)']
        .name,
    )
    .withArgs(
      ethers.utils.solidityPack(['address'], [from.address]),
      ethers.utils.solidityPack(['address'], [recipient]),
      direction === 'A_TO_A' ? chainNameA : chainNameB,
      amountParsed,
      amountOut,
    );

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceFromAfter = await mTBILL.balanceOf(from.address);
  const balanceToAfter = await pToken.balanceOf(recipient);

  const expectedReceiveAmount = await tokenAmountToBase18(pToken, amountOut);

  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(amountParsed));

  expect(balanceFromAfter).eq(balanceFromBefore.sub(amountParsed));
  expect(balanceToAfter).eq(balanceToBefore.add(expectedReceiveAmount));
};
