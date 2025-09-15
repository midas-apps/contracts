import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
} from '../../../typechain-types';
import {
  AccountOrContract,
  balanceOfBase18,
  getAccount,
  OptionalCommonParams,
} from '../../common/common.helpers';
import { acreAdapterFixture } from '../../common/fixtures';

export const acreWrapperDepositTest = async (
  fixture: Awaited<ReturnType<typeof acreAdapterFixture>>,
  amountN: number,
  receiver?: AccountOrContract,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? fixture.regularAccounts[0];
  receiver = receiver ?? from;
  const receiverAddress = getAccount(receiver);

  const amountBase18 = parseUnits(amountN.toFixed(18).replace(/\.?0+$/, ''));
  const balanceUserBefore = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceReceiverBefore = await balanceOfBase18(
    fixture.stableCoins.usdc,
    receiverAddress,
  );
  const balanceMTokenBefore = await balanceOfBase18(fixture.mTBILL, from);
  const receiverBalanceMTokenBefore = await balanceOfBase18(
    fixture.mTBILL,
    receiverAddress,
  );

  const mTokenRate = await fixture.mTokenToUsdDataFeed.getDataInBase18();

  if (opt?.revertMessage) {
    await expect(
      fixture.acreUsdcMTbillAdapter
        .connect(from)
        .deposit(parseUnits(amountN.toString(), 8), receiverAddress),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const tokenConfig = await fixture.depositVault.tokensConfig(
    fixture.stableCoins.usdc.address,
  );
  // eslint-disable-next-line camelcase
  const dataFeedContract = DataFeedTest__factory.connect(
    tokenConfig.dataFeed,
    from,
  );
  const currentTokenInPrice = tokenConfig.stable
    ? constants.WeiPerEther
    : await dataFeedContract.getDataInBase18();

  const expectedMintAmount = currentTokenInPrice
    .mul(amountBase18)
    .div(mTokenRate);

  const sharesMintedReturned = await fixture.acreUsdcMTbillAdapter
    .connect(from)
    .callStatic.deposit(parseUnits(amountN.toString(), 8), receiverAddress);

  await expect(
    fixture.acreUsdcMTbillAdapter
      .connect(from)
      .deposit(parseUnits(amountN.toString(), 8), receiverAddress),
  )
    .emit(
      fixture.acreUsdcMTbillAdapter,
      fixture.acreUsdcMTbillAdapter.interface.events[
        'Deposit(address,address,uint256,uint256)'
      ].name,
    )
    .withArgs(
      from.address,
      receiverAddress,
      parseUnits(amountN.toString(), 8),
      expectedMintAmount,
    ).not.reverted;

  const balanceUserAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceReceiverAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    receiverAddress,
  );
  const balanceContractAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    fixture.acreUsdcMTbillAdapter.address,
  );
  const balanceMTokenAfter = await balanceOfBase18(fixture.mTBILL, from);
  const receiverBalanceMTokenAfter = await balanceOfBase18(
    fixture.mTBILL,
    receiverAddress,
  );

  if (receiverAddress !== from.address) {
    expect(balanceReceiverAfter).eq(balanceReceiverBefore);
    expect(receiverBalanceMTokenAfter).eq(
      receiverBalanceMTokenBefore.add(expectedMintAmount),
    );
    expect(balanceMTokenAfter).eq(balanceMTokenBefore);
  } else {
    expect(balanceMTokenAfter).eq(balanceMTokenBefore.add(expectedMintAmount));
  }

  expect(balanceUserAfter).eq(balanceUserBefore.sub(amountBase18));
  expect(sharesMintedReturned).eq(expectedMintAmount);
  expect(balanceContractAfter).eq(constants.Zero);
};

export const acreWrapperRequestRedeemTest = async (
  fixture: Awaited<ReturnType<typeof acreAdapterFixture>>,
  amountN: number,
  receiver?: AccountOrContract,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? fixture.regularAccounts[0];
  receiver = receiver ?? from;

  const receiverAddress = getAccount(receiver);

  const amountBase18 = parseUnits(amountN.toFixed(18).replace(/\.?0+$/, ''));

  if (opt?.revertMessage) {
    await expect(
      fixture.acreUsdcMTbillAdapter
        .connect(from)
        .requestRedeem(amountBase18, receiverAddress),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceUserBefore = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceReceiverBefore = await balanceOfBase18(
    fixture.stableCoins.usdc,
    receiverAddress,
  );
  const balanceMTokenBefore = await balanceOfBase18(fixture.mTBILL, from);
  const receiverBalanceMTokenBefore = await balanceOfBase18(
    fixture.mTBILL,
    receiverAddress,
  );

  const requestIdReturned = await fixture.acreUsdcMTbillAdapter
    .connect(from)
    .callStatic.requestRedeem(amountBase18, receiverAddress);
  const requestId = await fixture.redemptionVault.currentRequestId();

  await expect(
    fixture.acreUsdcMTbillAdapter
      .connect(from)
      .requestRedeem(amountBase18, receiverAddress),
  )
    .emit(
      fixture.acreUsdcMTbillAdapter,
      fixture.acreUsdcMTbillAdapter.interface.events[
        'RedeemRequest(uint256,address,address,uint256)'
      ].name,
    )
    .withArgs(requestId, from.address, receiverAddress, amountBase18).not
    .reverted;

  const balanceUserAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceReceiverAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    receiverAddress,
  );
  const balanceContractAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    fixture.acreUsdcMTbillAdapter.address,
  );
  const balanceMTokenAfter = await balanceOfBase18(fixture.mTBILL, from);
  const receiverBalanceMTokenAfter = await balanceOfBase18(
    fixture.mTBILL,
    receiverAddress,
  );
  const request = await fixture.redemptionVault.redeemRequests(requestId);

  if (receiverAddress !== from.address) {
    expect(balanceReceiverAfter).eq(balanceReceiverBefore);
    expect(receiverBalanceMTokenAfter).eq(receiverBalanceMTokenBefore);
  }

  expect(requestIdReturned).eq(requestId);
  expect(request.amountMToken).eq(amountBase18);
  expect(request.sender).eq(receiverAddress);
  expect(balanceUserAfter).eq(balanceUserBefore);
  expect(balanceContractAfter).eq(constants.Zero);
  expect(balanceMTokenAfter).eq(balanceMTokenBefore.sub(amountBase18));

  return { ...request, requestId };
};
