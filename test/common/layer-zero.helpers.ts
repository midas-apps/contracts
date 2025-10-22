import { addressToBytes32, Options } from '@layerzerolabs/lz-v2-utilities';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract, ContractTransaction } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { OptionalCommonParams, tokenAmountToBase18 } from './common.helpers';
import { calcExpectedMintAmount } from './deposit-vault.helpers';
import { layerZeroFixture } from './fixtures';
import { calcExpectedTokenOutAmount } from './redemption-vault.helpers';

import {
  // eslint-disable-next-line camelcase
  DepositVault__factory,
  // eslint-disable-next-line camelcase
  ERC20__factory,
  MidasLzMintBurnOFTAdapter,
  // eslint-disable-next-line camelcase
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
  { mTBILL, oftAdapterA, oftAdapterB, owner }: CommonParams,
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
    dstEid: direction === 'A_TO_B' ? 2 : 1,
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

export const depositAndSend = async (
  {
    composer,
    pTokenLzOftAdapter,
    mTBILL,
    owner,
    mTokenToUsdDataFeed,
  }: CommonParams,
  {
    amount,
    recipient,
    direction,
  }: {
    amount: number;
    recipient?: string;
    direction?: 'A_TO_A' | 'A_TO_B';
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
  recipient ??= from.address;
  direction ??= 'A_TO_A';

  amount ??= 100;
  const decimals = await composer.paymentTokenDecimals();

  // eslint-disable-next-line camelcase
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

  // eslint-disable-next-line camelcase
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();
  const { fee, mintAmount, amountInWithoutFee, actualAmountInUsd } =
    await calcExpectedMintAmount(
      from,
      await composer.paymentTokenErc20(),
      // eslint-disable-next-line camelcase
      DepositVault__factory.connect(await composer.depositVault(), from),
      mTokenRate,
      amountParsedBase18,
      true,
    );

  const dust = mintAmount.sub(mintAmount.div(oneSD).mul(oneSD));
  const mintAmountWoDust = mintAmount.sub(dust);

  const secondHopSendParam = {
    dstEid: direction === 'A_TO_A' ? 1 : 2,
    to: addressToBytes32(recipient),
    amountLD: mintAmountWoDust, // this ammount will be overrided in the composer call
    minAmountLD: mintAmountWoDust,
    extraOptions: Options.newOptions()
      .addExecutorLzReceiveOption(300_000, 0)
      .toHex(),
    composeMsg: '0x',
    oftCmd: '0x',
  };

  const nativeFee =
    direction === 'A_TO_A'
      ? BigNumber.from(0)
      : await pTokenLzOftAdapter
          .quoteSend(
            // if the destination is the hub, we need to quote the send param for the source chain
            secondHopSendParam,
            false,
          )
          .then((v) => v.nativeFee);

  const params = [
    amountParsed,
    {
      amountLD: mintAmount.toString(),
      minAmountLD: mintAmountWoDust.toString(),
      extraOptions: Options.newOptions().toHex(),
      composeMsg: '0x' as `0x${string}`,
      oftCmd: '0x' as `0x${string}`,
      dstEid: direction === 'A_TO_A' ? 1 : 2,
      to: addressToBytes32(recipient),
    },
    from.address,
    { value: nativeFee, gasLimit: 1_000_000 },
  ] as const;

  if (opt?.revertMessage && !opt?.revertOnDst) {
    await expect(
      composer.connect(opt?.from ?? owner).depositAndSend(...params),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  if (opt?.revertWithCustomError && !opt?.revertOnDst) {
    await expect(
      composer.connect(opt?.from ?? owner).depositAndSend(...params),
    ).revertedWithCustomError(
      opt?.revertWithCustomError.contract,
      opt?.revertWithCustomError.error,
    );
    return;
  }

  const totalSupplyBefore = await mTBILL.totalSupply();
  const balanceFromBefore = await pToken.balanceOf(from.address);
  const balanceToBefore = await mTBILL.balanceOf(recipient);

  await expect(composer.connect(from).depositAndSend(...params)).to.emit(
    composer,
    composer.interface.events[
      'Deposited(bytes32,bytes32,uint32,uint256,uint256)'
    ].name,
  ).not.reverted;

  const totalSupplyAfter = await mTBILL.totalSupply();
  const balanceFromAfter = await pToken.balanceOf(from.address);
  const balanceToAfter = await mTBILL.balanceOf(recipient);

  // try/catch of mocked lz endpoint catches all the errors, so that is the only way
  // to check if the revert happened on the dst
  if (opt?.revertOnDst) {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
    return;
  }

  expect(totalSupplyAfter).eq(totalSupplyBefore.add(mintAmount));

  expect(balanceFromAfter).eq(balanceFromBefore.sub(amountParsed));
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
    oftAdapterA,
    oftAdapterB,
  }: CommonParams,
  {
    amount,
    recipient,
    direction,
  }: {
    amount: number;
    recipient?: string;
    direction?: 'A_TO_A' | 'B_TO_B' | 'B_TO_A' | 'A_TO_B';
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
  recipient ??= from.address;
  direction ??= 'A_TO_A';

  amount ??= 100;

  // eslint-disable-next-line camelcase
  const pToken = ERC20__factory.connect(
    await composer.paymentTokenErc20(),
    from,
  );

  const amountParsed = parseUnits(amount.toFixed(18).replace(/\.?0+$/, ''));

  const oneSD = parseUnits('1', 6);

  // eslint-disable-next-line camelcase
  const mTokenRate = await mTokenToUsdDataFeed.getDataInBase18();
  const { amountOut } = await calcExpectedTokenOutAmount(
    from,
    pToken,
    // eslint-disable-next-line camelcase
    RedemptionVault__factory.connect(await composer.redemptionVault(), from),
    mTokenRate,
    amountParsed,
    true,
  );

  const dust = amountOut.sub(amountOut.div(oneSD).mul(oneSD));
  const redeemedAmountWoDust = amountOut.sub(dust);

  const secondHopSendParam = {
    dstEid: direction === 'A_TO_A' || direction === 'B_TO_A' ? 1 : 2,
    to: addressToBytes32(recipient),
    amountLD: redeemedAmountWoDust, // this ammount will be overrided in the composer call
    minAmountLD: redeemedAmountWoDust,
    extraOptions: Options.newOptions()
      .addExecutorLzReceiveOption(300_000, 0)
      .toHex(),
    composeMsg: '0x',
    oftCmd: '0x',
  };

  const nativeFee =
    direction === 'A_TO_A'
      ? BigNumber.from(0)
      : await (direction === 'B_TO_A' || direction === 'B_TO_B'
          ? pTokenLzOft
          : pTokenLzOftAdapter
        )
          .quoteSend(
            // if the destination is the hub, we need to quote the send param for the source chain
            direction === 'B_TO_A' || direction === 'B_TO_B'
              ? { ...secondHopSendParam, dstEid: 2 }
              : secondHopSendParam,
            false,
          )
          .then((v) => v.nativeFee);

  const lzComposeValue = nativeFee;

  const composeMsg =
    direction === 'B_TO_A' || direction === 'B_TO_B'
      ? ethers.utils.defaultAbiCoder.encode(
          [
            'tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)',
            'uint256',
          ],
          [
            [
              secondHopSendParam.dstEid,
              secondHopSendParam.to,
              secondHopSendParam.amountLD,
              secondHopSendParam.minAmountLD,
              secondHopSendParam.extraOptions,
              secondHopSendParam.composeMsg,
              secondHopSendParam.oftCmd,
            ],
            lzComposeValue,
          ],
        )
      : '0x';

  const options = Options.newOptions().addExecutorLzReceiveOption(300_000, 0);

  if (composeMsg !== '0x') {
    options.addExecutorComposeOption(0, 600_000, 0);
  }

  const params = [
    amountParsed,
    {
      amountLD: amountParsed.toString(),
      minAmountLD: amountParsed.toString(),
      extraOptions: options.toHex(),
      composeMsg,
      oftCmd: '0x' as `0x${string}`,
      dstEid: direction === 'A_TO_A' || direction === 'B_TO_A' ? 1 : 2,
      to: addressToBytes32(recipient),
    },
    from.address,
    { value: nativeFee, gasLimit: 1_000_000 },
  ] as const;

  let txFn: () => Promise<ContractTransaction>;

  if (direction === 'B_TO_A' || direction === 'B_TO_B') {
    const msgFee = await oftAdapterB
      .quoteSend(params[1], false)
      .then((v) => v.nativeFee);

    txFn = oftAdapterB
      .connect(from)
      .send.bind(
        this,
        params[1],
        { nativeFee: msgFee, lzTokenFee: 0 },
        from.address,
        {
          value: msgFee,
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

  await expect(txFn()).to.not.reverted;

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

  // try/catch of mocked lz endpoint catches all the errors, so that is the only way
  // to check if the revert happened on the dst
  if (opt?.revertOnDst) {
    expect(totalSupplyAfter).eq(totalSupplyBefore);
    return;
  }

  expect(totalSupplyAfter).eq(totalSupplyBefore.sub(amountParsed));

  expect(balanceFromAfter).eq(balanceFromBefore.sub(amountParsed));
  expect(balanceToAfter).eq(balanceToBefore.add(expectedReceiveAmount));
};
