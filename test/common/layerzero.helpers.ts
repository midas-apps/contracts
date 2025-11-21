import { addressToBytes32, Options } from '@layerzerolabs/lz-v2-utilities';
import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  constants,
  Contract,
  ContractTransaction,
} from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { OptionalCommonParams, tokenAmountToBase18 } from './common.helpers';
import { calcExpectedMintAmount } from './deposit-vault.helpers';
import { layerZeroFixture } from './fixtures';
import { calcExpectedTokenOutAmount } from './redemption-vault.helpers';

import {
  DepositVault__factory,
  ERC20,
  ERC20__factory,
  MidasLzMintBurnOFTAdapter,
  MidasLzOFTAdapter,
  RedemptionVault__factory,
} from '../../typechain-types';

type CommonParams = Pick<
  Awaited<ReturnType<typeof layerZeroFixture>>,
  | 'oftAdapterA'
  | 'oftAdapterB'
  | 'owner'
  | 'mockEndpointA'
  | 'mockEndpointB'
  | 'mTBILL'
  | 'composer'
  | 'pTokenLzOftAdapter'
  | 'pTokenLzOft'
  | 'mTokenToUsdDataFeed'
  | 'depositVault'
  | 'redemptionVault'
  | 'eidA'
  | 'eidB'
>;

export const setRateLimitConfig = async (
  {
    oftAdapter,
    owner,
  }: { oftAdapter: MidasLzMintBurnOFTAdapter } & Pick<CommonParams, 'owner'>,
  {
    dstEid,
    limit,
    window,
  }: {
    dstEid: number;
    limit: BigNumberish;
    window: number;
  },
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      oftAdapter.connect(from).setRateLimits([{ dstEid, limit, window }]),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await oftAdapter.connect(from).setRateLimits([{ dstEid, limit, window }]);
  // TODO: check rate limits
};

export const sendOft = async (
  { mTBILL, oftAdapterA, oftAdapterB, owner, eidA, eidB }: CommonParams,
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

  const oftFrom = direction === 'A_TO_B' ? oftAdapterA : oftAdapterB;
  const oftTo = direction === 'A_TO_B' ? oftAdapterB : oftAdapterA;

  const lzParams = {
    amountLD: amountParsed.toString(),
    composeMsg: '0x',
    dstEid: direction === 'A_TO_B' ? eidB : eidA,
    extraOptions: Options.newOptions()
      .addExecutorLzReceiveOption(200_000, 0)
      .toHex(),
    minAmountLD: amountWoDust.toString(),
    oftCmd: '0x',
    to: addressToBytes32(recipient),
  };
  // Fetching the native fee for the token send operation
  const { nativeFee } = await oftFrom.quoteSend(lzParams, false).catch((_) => {
    return { nativeFee: parseUnits('0.1', 18), lzTokenFee: 0 };
  });

  const params = [
    lzParams,
    { lzTokenFee: 0, nativeFee },
    from.address,
    { value: nativeFee },
  ] as const;

  if (opt?.revertMessage && !opt?.revertOnDst) {
    await expect(
      oftFrom.connect(opt?.from ?? owner).send(...params),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError && !opt?.revertOnDst) {
    await expect(
      oftFrom.connect(opt?.from ?? owner).send(...params),
    ).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await mTBILL.balanceOf(from.address);
  const balanceToBefore = await mTBILL.balanceOf(recipient);

  await expect(oftFrom.connect(from).send(...params)).to.emit(
    oftFrom,
    oftFrom.interface.events['OFTSent(bytes32,uint32,address,uint256,uint256)']
      .name,
  ).not.reverted;

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

export const sendOftLockBox = async (
  {
    owner,
    pTokenLzOft,
    pTokenLzOftAdapter,
    pToken,
    eidA,
    eidB,
  }: CommonParams & {
    pToken: ERC20;
    oftAdapterA: MidasLzOFTAdapter;
    oftAdapterB: MidasLzOFTAdapter;
  },
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

  const oftFrom = direction === 'A_TO_B' ? pTokenLzOftAdapter : pTokenLzOft;
  const oftTo = direction === 'A_TO_B' ? pTokenLzOft : pTokenLzOftAdapter;

  const lzParams = {
    amountLD: amountParsed.toString(),
    composeMsg: '0x',
    dstEid: direction === 'A_TO_B' ? eidB : eidA,
    extraOptions: Options.newOptions()
      .addExecutorLzReceiveOption(200_000, 0)
      .toHex(),
    minAmountLD: amountWoDust.toString(),
    oftCmd: '0x',
    to: addressToBytes32(recipient),
  };
  // Fetching the native fee for the token send operation
  const { nativeFee } = await oftFrom.quoteSend(lzParams, false).catch((_) => {
    return { nativeFee: parseUnits('0.1', 18), lzTokenFee: 0 };
  });

  const params = [
    lzParams,
    { lzTokenFee: 0, nativeFee },
    from.address,
    { value: nativeFee },
  ] as const;

  if (opt?.revertMessage && !opt?.revertOnDst) {
    await expect(
      oftFrom.connect(opt?.from ?? owner).send(...params),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError && !opt?.revertOnDst) {
    await expect(
      oftFrom.connect(opt?.from ?? owner).send(...params),
    ).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await pToken.totalSupply();
  const totalSupplyOftBefore = await pTokenLzOft.totalSupply();
  const balanceFromBefore = await pToken.balanceOf(from.address);
  const balanceFromOftBefore = await pTokenLzOft.balanceOf(from.address);
  const balanceToBefore = await pToken.balanceOf(recipient);
  const balanceToOftBefore = await pTokenLzOft.balanceOf(recipient);

  await expect(oftFrom.connect(from).send(...params)).to.emit(
    oftFrom,
    oftFrom.interface.events['OFTSent(bytes32,uint32,address,uint256,uint256)']
      .name,
  ).not.reverted;

  const totalSupplyAfter = await pToken.totalSupply();
  const totalSupplyOftAfter = await pTokenLzOft.totalSupply();
  const balanceFromAfter = await pToken.balanceOf(from.address);
  const balanceFromOftAfter = await pTokenLzOft.balanceOf(from.address);
  const balanceToAfter = await pToken.balanceOf(recipient);
  const balanceToOftAfter = await pTokenLzOft.balanceOf(recipient);

  expect(totalSupplyAfter).eq(totalSupplyBefore);

  expect(totalSupplyOftAfter).eq(
    direction === 'A_TO_B'
      ? totalSupplyOftBefore.add(amountWoDust)
      : totalSupplyOftBefore.sub(amountWoDust),
  );

  if (direction === 'B_TO_A') {
    expect(balanceFromOftAfter).eq(balanceFromOftBefore.sub(amountWoDust));
    expect(balanceToAfter).eq(balanceToBefore.add(amountWoDust));
  } else {
    expect(balanceToOftAfter).eq(balanceToOftBefore.add(amountWoDust));
    expect(balanceFromAfter).eq(balanceFromBefore.sub(amountWoDust));
  }
};

export const depositAndSend = async (
  {
    composer,
    mTBILL,
    owner,
    mTokenToUsdDataFeed,
    oftAdapterA,
    depositVault,
    eidA,
    eidB,
    pTokenLzOft,
    mockEndpointA,
    mockEndpointB,
  }: CommonParams,
  {
    amount,
    recipient,
    direction,
    referrerId,
    minAmountLD,
  }: {
    amount: number;
    recipient?: string;
    direction?: 'A_TO_A' | 'A_TO_B' | 'B_TO_A' | 'B_TO_B';
    referrerId?: string;
    minAmountLD?: BigNumberish;
  },
  opt?: {
    revertOnDst?: boolean;
    refundOnDst?: boolean;
    revertWithCustomError?: {
      contract: Contract;
      error: string;
    };
    overrideValue?: BigNumberish;
    expectedMintAmountWoDust?: BigNumberish;
  } & OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  recipient ??= from.address;
  direction ??= 'A_TO_A';

  amount ??= 100;
  const decimals = await composer.paymentTokenDecimals();

  referrerId ??= constants.HashZero;

  const pToken = ERC20__factory.connect(
    await composer.paymentTokenErc20(),
    from,
  );

  const amountParsed = parseUnits(
    amount.toFixed(decimals).replace(/\.?0+$/, ''),
  );
  const amountParsedBase18 = parseUnits(
    amount.toFixed(18).replace(/\.?0+$/, ''),
  );

  const oneSD = parseUnits('1', 9);

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();
  const { fee, mintAmount, amountInWithoutFee, actualAmountInUsd } =
    await calcExpectedMintAmount(
      from,
      await composer.paymentTokenErc20(),

      DepositVault__factory.connect(await composer.depositVault(), from),
      mTokenRate,
      amountParsedBase18,
      true,
    );

  const dust = mintAmount.sub(mintAmount.div(oneSD).mul(oneSD));
  const mintAmountWoDust = mintAmount.sub(dust);

  if (opt?.expectedMintAmountWoDust !== undefined) {
    expect(mintAmountWoDust).eq(opt?.expectedMintAmountWoDust);
  }

  const secondHopSendParam = {
    dstEid: direction === 'A_TO_A' || direction === 'B_TO_A' ? eidA : eidB,
    to: addressToBytes32(recipient),
    amountLD: mintAmountWoDust.toString(),
    minAmountLD: 0,
    extraOptions: Options.newOptions()
      .addExecutorLzReceiveOption(1_000_000, 0)
      .toHex(),
    composeMsg: '0x',
    oftCmd: '0x',
  };

  const nativeFee =
    direction === 'A_TO_A' || direction === 'B_TO_A'
      ? opt?.refundOnDst
        ? await oftAdapterA
            .quoteSend({ ...secondHopSendParam, dstEid: eidB }, false)
            .then((v) => v.nativeFee)
        : BigNumber.from(0)
      : await oftAdapterA
          .quoteSend(secondHopSendParam, false)
          .then((v) => v.nativeFee);

  const extraOptions = referrerId
    ? ethers.utils.defaultAbiCoder.encode(['bytes32'], [referrerId])
    : '0x';

  const lzComposeValue = nativeFee;

  const composeMsg =
    direction === 'B_TO_A' || direction === 'B_TO_B'
      ? ethers.utils.defaultAbiCoder.encode(
          [
            'tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)',
            'uint256',
            'bytes',
          ],
          [
            [
              secondHopSendParam.dstEid,
              secondHopSendParam.to,
              secondHopSendParam.amountLD,
              (minAmountLD ?? mintAmountWoDust).toString(),
              secondHopSendParam.extraOptions,
              secondHopSendParam.composeMsg,
              secondHopSendParam.oftCmd,
            ],
            lzComposeValue,
            extraOptions,
          ],
        )
      : '0x';

  const options = Options.newOptions().addExecutorLzReceiveOption(1_000_000, 0);

  if (composeMsg !== '0x') {
    options.addExecutorComposeOption(0, 600_000, 0);
  }

  const params = [
    amountParsed,
    extraOptions,
    {
      amountLD: amountParsed.toString(),
      minAmountLD: (minAmountLD ?? mintAmountWoDust).toString(),
      extraOptions: options.toHex(),
      composeMsg,
      oftCmd: '0x' as `0x${string}`,
      dstEid: direction === 'A_TO_A' || direction === 'B_TO_A' ? eidA : eidB,
      to: addressToBytes32(recipient),
    },
    from.address,
    { value: opt?.overrideValue ?? nativeFee, gasLimit: 1_000_000 },
  ] as const;

  let txFn: () => Promise<ContractTransaction>;

  if (direction === 'B_TO_A' || direction === 'B_TO_B') {
    const paramsOft = {
      ...params[2],
      to: addressToBytes32(composer.address),
      minAmountLD: 0,
      dstEid: eidA,
    };

    const msgFee = await pTokenLzOft
      .quoteSend(paramsOft, false)
      .then((v) => v.nativeFee);

    const value = opt?.overrideValue ?? msgFee;
    await mockEndpointB.setNextComposerMsgValue({ value: lzComposeValue });
    await mockEndpointA.setNextComposerMsgValue({ value: lzComposeValue });
    txFn = pTokenLzOft.connect(from).send.bind(
      this,
      {
        ...paramsOft,
      },
      { nativeFee: msgFee, lzTokenFee: 0 },
      from.address,
      {
        value,
        gasLimit: 2_000_000,
      },
    );
  } else {
    txFn = composer.connect(from).depositAndSend.bind(this, ...params);
  }

  if (opt?.revertMessage && !opt?.revertOnDst) {
    await expect(txFn()).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError && !opt?.revertOnDst) {
    await expect(txFn()).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await pToken.balanceOf(from.address);
  const balanceFromOftBefore = await pTokenLzOft.balanceOf(from.address);
  const balanceToBefore = await mTBILL.balanceOf(recipient);

  if (opt?.refundOnDst) {
    await expect(txFn()).to.emit(
      composer,
      composer.interface.events['Refunded(bytes32)'].name,
    );
  } else {
    await expect(txFn())
      .to.emit(
        composer,
        composer.interface.events[
          'Deposited(bytes32,bytes32,uint32,uint256,uint256)'
        ].name,
      )
      .to.emit(
        depositVault,
        depositVault.interface.events[
          'DepositInstantWithCustomRecipient(address,address,address,uint256,uint256,uint256,uint256,bytes32)'
        ].name,
      )
      .withArgs(
        composer.address,
        await composer.paymentTokenErc20(),
        direction === 'A_TO_A' || direction === 'B_TO_A'
          ? recipient
          : composer.address,
        actualAmountInUsd,
        amountParsed,
        fee,
        mintAmount,
        referrerId,
      );
  }

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceFromAfter = await pToken.balanceOf(from.address);
  const balanceFromOftAfter = await pTokenLzOft.balanceOf(from.address);
  const balanceToAfter = await mTBILL.balanceOf(recipient);

  // try/catch of mocked lz endpoint catches all the errors, so that is the only way
  // to check if the revert happened on the dst
  if (opt?.refundOnDst) {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
    expect(balanceToAfter).eq(balanceToBefore);
    expect(balanceFromAfter).eq(balanceFromBefore);
    expect(balanceFromOftAfter).eq(balanceFromOftBefore);
    return;
  } else if (opt?.revertOnDst) {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
    return;
  }

  expect(totalSupplyAfter).eq(totalSupplyBefore.add(mintAmount));

  if (direction === 'B_TO_A' || direction === 'B_TO_B') {
    expect(balanceFromAfter).eq(balanceFromBefore);
    expect(balanceFromOftAfter).eq(
      balanceFromOftBefore.sub(amountParsedBase18),
    );
  } else {
    expect(balanceFromAfter).eq(balanceFromBefore.sub(amountParsed));
    expect(balanceFromOftAfter).eq(balanceFromOftBefore);
  }

  expect(balanceToAfter).eq(balanceToBefore.add(mintAmountWoDust));
};

export const redeemAndSend = async (
  {
    composer,
    pTokenLzOftAdapter,
    mTBILL,
    owner,
    mTokenToUsdDataFeed,
    pTokenLzOft,
    oftAdapterB,
    redemptionVault,
    mockEndpointB,
    mockEndpointA,
    eidA,
    eidB,
  }: CommonParams,
  {
    amount,
    recipient,
    direction,
    minAmountLD,
  }: {
    amount: number;
    recipient?: string;
    minAmountLD?: BigNumberish;
    direction?: 'A_TO_A' | 'B_TO_B' | 'B_TO_A' | 'A_TO_B';
  },
  opt?: {
    refundOnDst?: boolean;
    expectedReceiveAmountWoDust?: BigNumberish;
    revertOnDst?: boolean;
    revertWithCustomError?: {
      contract: Contract;
      error: string;
    };
    overrideValue?: BigNumberish;
  } & OptionalCommonParams,
) => {
  const from = opt?.from ?? owner;
  recipient ??= from.address;
  direction ??= 'A_TO_A';

  amount ??= 100;

  const pToken = ERC20__factory.connect(
    await composer.paymentTokenErc20(),
    from,
  );

  const amountParsed = parseUnits(amount.toFixed(18).replace(/\.?0+$/, ''));

  const oneSD = parseUnits('1', 6);

  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();
  const { amountOut, fee } = await calcExpectedTokenOutAmount(
    from,
    pToken,

    RedemptionVault__factory.connect(await composer.redemptionVault(), from),
    mTokenRate,
    amountParsed,
    true,
  );

  const dust = amountOut.sub(amountOut.div(oneSD).mul(oneSD));
  const redeemedAmountWoDust = amountOut.sub(dust);

  if (opt?.expectedReceiveAmountWoDust !== undefined) {
    expect(amountOut).eq(opt?.expectedReceiveAmountWoDust);
  }

  const secondHopSendParam = {
    dstEid: direction === 'A_TO_A' || direction === 'B_TO_A' ? eidA : eidB,
    to: addressToBytes32(recipient),
    amountLD: redeemedAmountWoDust.toString(),
    minAmountLD: 0,
    extraOptions: Options.newOptions()
      .addExecutorLzReceiveOption(1_000_000, 0)
      .toHex(),
    composeMsg: '0x',
    oftCmd: '0x',
  };

  const nativeFee =
    direction === 'A_TO_A' || direction === 'B_TO_A'
      ? opt?.refundOnDst
        ? await pTokenLzOftAdapter
            .quoteSend({ ...secondHopSendParam, dstEid: eidB }, false)
            .then((v) => v.nativeFee)
        : BigNumber.from(0)
      : await pTokenLzOftAdapter
          .quoteSend(secondHopSendParam, false)
          .then((v) => v.nativeFee);

  const lzComposeValue = nativeFee;

  const composeMsg =
    direction === 'B_TO_A' || direction === 'B_TO_B'
      ? ethers.utils.defaultAbiCoder.encode(
          [
            'tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)',
            'uint256',
            'bytes',
          ],
          [
            [
              secondHopSendParam.dstEid,
              secondHopSendParam.to,
              secondHopSendParam.amountLD,
              (minAmountLD ?? redeemedAmountWoDust).toString(),
              secondHopSendParam.extraOptions,
              secondHopSendParam.composeMsg,
              secondHopSendParam.oftCmd,
            ],
            lzComposeValue,
            '0x',
          ],
        )
      : '0x';

  const options = Options.newOptions().addExecutorLzReceiveOption(1_000_000, 0);

  if (composeMsg !== '0x') {
    options.addExecutorComposeOption(0, 600_000, 0);
  }

  const params = [
    amountParsed,
    '0x',
    {
      amountLD: amountParsed.toString(),
      minAmountLD: (minAmountLD ?? redeemedAmountWoDust).toString(),
      extraOptions: options.toHex(),
      composeMsg,
      oftCmd: '0x' as `0x${string}`,
      dstEid: direction === 'A_TO_A' || direction === 'B_TO_A' ? eidA : eidB,
      to: addressToBytes32(recipient),
    },
    from.address,
    { value: opt?.overrideValue ?? nativeFee, gasLimit: 1_000_000 },
  ] as const;

  let txFn: () => Promise<ContractTransaction>;

  if (direction === 'B_TO_A' || direction === 'B_TO_B') {
    const paramsOft = {
      ...params[2],
      to: addressToBytes32(composer.address),
      minAmountLD: 0,
      dstEid: eidA,
    };

    const msgFee = await oftAdapterB
      .quoteSend(paramsOft, false)
      .then((v) => v.nativeFee);

    const value = opt?.overrideValue ?? msgFee;
    await mockEndpointB.setNextComposerMsgValue({ value: lzComposeValue });
    await mockEndpointA.setNextComposerMsgValue({ value: lzComposeValue });
    txFn = oftAdapterB.connect(from).send.bind(
      this,
      {
        ...paramsOft,
      },
      { nativeFee: msgFee, lzTokenFee: 0 },
      from.address,
      {
        value,
        gasLimit: 2_000_000,
      },
    );
  } else {
    txFn = composer.connect(from).redeemAndSend.bind(this, ...params);
  }

  if (opt?.revertMessage && !opt?.revertOnDst) {
    await expect(txFn()).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError && !opt?.revertOnDst) {
    await expect(txFn()).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await mTBILL.balanceOf(from.address);
  const balanceToBefore =
    direction === 'A_TO_A' || direction === 'B_TO_A'
      ? await pToken.balanceOf(recipient)
      : await pTokenLzOft.balanceOf(recipient);

  if (opt?.refundOnDst) {
    await expect(txFn()).to.emit(
      composer,
      composer.interface.events['Refunded(bytes32)'].name,
    );
  } else {
    await expect(txFn())
      .to.emit(
        composer,
        composer.interface.events[
          'Redeemed(bytes32,bytes32,uint32,uint256,uint256)'
        ].name,
      )
      .withArgs(
        addressToBytes32(from.address),
        addressToBytes32(recipient),
        direction === 'A_TO_A' || direction === 'B_TO_A' ? eidA : eidB,
        amountParsed,
        amountOut,
      )
      .to.emit(
        redemptionVault,
        redemptionVault.interface.events[
          'RedeemInstantWithCustomRecipient(address,address,address,uint256,uint256,uint256)'
        ].name,
      )
      .withArgs(
        composer.address,
        await composer.paymentTokenErc20(),
        direction === 'A_TO_A' || direction === 'B_TO_A'
          ? recipient
          : composer.address,
        amountParsed,
        fee,
        amountOut,
      );
  }

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceFromAfter = await mTBILL.balanceOf(from.address);
  const balanceToAfter =
    direction === 'A_TO_A' || direction === 'B_TO_A'
      ? await pToken.balanceOf(recipient)
      : await pTokenLzOft.balanceOf(recipient);

  const expectedReceiveAmount =
    direction === 'A_TO_A' || direction === 'B_TO_A'
      ? redeemedAmountWoDust
      : await tokenAmountToBase18(pToken, amountOut);

  if (opt?.refundOnDst) {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
    expect(balanceToAfter).eq(balanceToBefore);
    expect(balanceFromAfter).eq(balanceFromBefore);
    return;
  } else if (opt?.revertOnDst) {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
    return;
  }

  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(amountParsed));

  expect(balanceFromAfter).eq(balanceFromBefore.sub(amountParsed));
  expect(balanceToAfter).eq(balanceToBefore.add(expectedReceiveAmount));
};
