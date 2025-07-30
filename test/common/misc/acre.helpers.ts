import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
} from '../../../typechain-types';
import {
  balanceOfBase18,
  OptionalCommonParams,
} from '../../common/common.helpers';
import { acreAdapterFixture } from '../../common/fixtures';

export const acreWrapperDepositTest = async (
  fixture: Awaited<ReturnType<typeof acreAdapterFixture>>,
  amountN: number,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? fixture.regularAccounts[0];

  const amountBase18 = parseUnits(amountN.toFixed(18).replace(/\.?0+$/, ''));
  const balanceUserBefore = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceMTokenBefore = await balanceOfBase18(fixture.mTBILL, from);

  const mTokenRate = await fixture.mTokenToUsdDataFeed.getDataInBase18();

  if (opt?.revertMessage) {
    await expect(
      fixture.acreUsdcMTbillAdapter
        .connect(from)
        .deposit(parseUnits(amountN.toString(), 8)),
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
    .callStatic.deposit(parseUnits(amountN.toString(), 8));

  await expect(
    fixture.acreUsdcMTbillAdapter
      .connect(from)
      .deposit(parseUnits(amountN.toString(), 8)),
  )
    .emit(
      fixture.acreUsdcMTbillAdapter,
      fixture.acreUsdcMTbillAdapter.interface.events[
        'Deposit(address,address,uint256,uint256)'
      ].name,
    )
    .withArgs(
      fixture.acreUsdcMTbillAdapter.address,
      from.address,
      parseUnits(amountN.toString(), 8),
      expectedMintAmount,
    ).not.reverted;

  const balanceUserAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceContractAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    fixture.acreUsdcMTbillAdapter.address,
  );
  const balanceMTokenAfter = await balanceOfBase18(fixture.mTBILL, from);

  expect(sharesMintedReturned).eq(expectedMintAmount);
  expect(balanceUserAfter).eq(balanceUserBefore.sub(amountBase18));
  expect(balanceContractAfter).eq(constants.Zero);
  expect(balanceMTokenAfter).eq(balanceMTokenBefore.add(expectedMintAmount));
};

export const acreWrapperRequestRedeemTest = async (
  fixture: Awaited<ReturnType<typeof acreAdapterFixture>>,
  amountN: number,
  opt?: OptionalCommonParams,
) => {
  const from = opt?.from ?? fixture.regularAccounts[0];

  const amountBase18 = parseUnits(amountN.toFixed(18).replace(/\.?0+$/, ''));

  if (opt?.revertMessage) {
    await expect(
      fixture.acreUsdcMTbillAdapter.connect(from).requestRedeem(amountBase18),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  const balanceUserBefore = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceMTokenBefore = await balanceOfBase18(fixture.mTBILL, from);

  const requestIdReturned = await fixture.acreUsdcMTbillAdapter
    .connect(from)
    .callStatic.requestRedeem(amountBase18);
  const requestId = await fixture.redemptionVault.currentRequestId();

  await expect(
    fixture.acreUsdcMTbillAdapter.connect(from).requestRedeem(amountBase18),
  )
    .emit(
      fixture.acreUsdcMTbillAdapter,
      fixture.acreUsdcMTbillAdapter.interface.events[
        'RedeemRequest(uint256,address,uint256)'
      ].name,
    )
    .withArgs(requestId, fixture.acreUsdcMTbillAdapter.address, amountBase18)
    .not.reverted;

  const balanceUserAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    from,
  );
  const balanceContractAfter = await balanceOfBase18(
    fixture.stableCoins.usdc,
    fixture.acreUsdcMTbillAdapter.address,
  );
  const balanceMTokenAfter = await balanceOfBase18(fixture.mTBILL, from);
  const request = await fixture.redemptionVault.redeemRequests(requestId);

  expect(requestIdReturned).eq(requestId);
  expect(request.amountMToken).eq(amountBase18);
  expect(request.sender).eq(from.address);
  expect(balanceUserAfter).eq(balanceUserBefore);
  expect(balanceContractAfter).eq(constants.Zero);
  expect(balanceMTokenAfter).eq(balanceMTokenBefore.sub(amountBase18));

  return { ...request, requestId };
};
