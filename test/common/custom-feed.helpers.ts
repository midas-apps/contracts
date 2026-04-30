import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { handleRevert, OptionalCommonParams } from './common.helpers';
import { defaultDeploy } from './fixtures';

type CommonParamsSetRoundData = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'customFeed' | 'owner'
>;

export const setRoundData = async (
  { customFeed, owner }: CommonParamsSetRoundData,
  data: number,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const dataParsed = parseUnits(data.toFixed(8).replace(/\.?0+$/, ''), 8);

  if (
    await handleRevert(
      customFeed.connect(sender).setRoundData.bind(this, dataParsed),
      customFeed,
      opt,
    )
  ) {
    return;
  }

  const lastRoundIdBefore = await customFeed.latestRound();
  const lastRoundDataBefore = await customFeed.latestRoundData();

  const nextTimestamp =
    (await customFeed.provider.getBlock('latest')).timestamp + 10;

  await setNextBlockTimestamp(nextTimestamp);

  await expect(customFeed.connect(sender).setRoundData(dataParsed))
    .to.emit(
      customFeed,
      customFeed.interface.events['AnswerUpdated(int256,uint256,uint256)'].name,
    )
    .withArgs(dataParsed, lastRoundIdBefore.add(1), nextTimestamp).to.not
    .reverted;

  const lastRoundIdAfter = await customFeed.latestRound();
  const lastRoundDataAfter = await customFeed.latestRoundData();
  const roundDataAfter = await customFeed.getRoundData(lastRoundIdAfter);

  expect(lastRoundIdAfter).eq(lastRoundIdBefore.add(1));
  expect(lastRoundDataAfter.roundId).eq(lastRoundDataBefore.roundId.add(1));
  expect(lastRoundDataAfter.answeredInRound).eq(
    lastRoundDataBefore.answeredInRound.add(1),
  );
  expect(lastRoundDataAfter.startedAt).eq(nextTimestamp);
  expect(lastRoundDataAfter.updatedAt).eq(nextTimestamp);
  expect(lastRoundDataAfter.answer).eq(dataParsed);

  expect(lastRoundDataAfter.answer).eq(roundDataAfter.answer);
  expect(lastRoundDataAfter.updatedAt).eq(roundDataAfter.updatedAt);
  expect(lastRoundDataAfter.startedAt).eq(roundDataAfter.startedAt);
  expect(lastRoundDataAfter.roundId).eq(roundDataAfter.roundId);
  expect(lastRoundDataAfter.answeredInRound).eq(roundDataAfter.answeredInRound);

  expect(await customFeed.lastTimestamp()).eq(lastRoundDataAfter.updatedAt);
  expect(await customFeed.lastAnswer()).eq(lastRoundDataAfter.answer);
};

export const setRoundDataSafe = async (
  { customFeed, owner }: CommonParamsSetRoundData,
  data: number,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const dataParsed = parseUnits(data.toFixed(8).replace(/\.?0+$/, ''), 8);

  if (
    await handleRevert(
      customFeed.connect(sender).setRoundDataSafe.bind(this, dataParsed),
      customFeed,
      opt,
    )
  ) {
    return;
  }

  const lastRoundIdBefore = await customFeed.latestRound();
  const lastRoundDataBefore = await customFeed.latestRoundData();

  const nextTimestamp =
    (await customFeed.provider.getBlock('latest')).timestamp + 10;

  await setNextBlockTimestamp(nextTimestamp);

  await expect(customFeed.connect(sender).setRoundDataSafe(dataParsed))
    .to.emit(
      customFeed,
      customFeed.interface.events['AnswerUpdated(int256,uint256,uint256)'].name,
    )
    .withArgs(dataParsed, lastRoundIdBefore.add(1), nextTimestamp).to.not
    .reverted;

  const lastRoundIdAfter = await customFeed.latestRound();
  const lastRoundDataAfter = await customFeed.latestRoundData();
  const roundDataAfter = await customFeed.getRoundData(lastRoundIdAfter);

  expect(lastRoundIdAfter).eq(lastRoundIdBefore.add(1));
  expect(lastRoundDataAfter.roundId).eq(lastRoundDataBefore.roundId.add(1));
  expect(lastRoundDataAfter.answeredInRound).eq(
    lastRoundDataBefore.answeredInRound.add(1),
  );
  expect(lastRoundDataAfter.startedAt).eq(nextTimestamp);
  expect(lastRoundDataAfter.updatedAt).eq(nextTimestamp);
  expect(lastRoundDataAfter.answer).eq(dataParsed);

  expect(lastRoundDataAfter.answer).eq(roundDataAfter.answer);
  expect(lastRoundDataAfter.updatedAt).eq(roundDataAfter.updatedAt);
  expect(lastRoundDataAfter.startedAt).eq(roundDataAfter.startedAt);
  expect(lastRoundDataAfter.roundId).eq(roundDataAfter.roundId);
  expect(lastRoundDataAfter.answeredInRound).eq(roundDataAfter.answeredInRound);

  expect(await customFeed.lastTimestamp()).eq(lastRoundDataAfter.updatedAt);
  expect(await customFeed.lastAnswer()).eq(lastRoundDataAfter.answer);
};

export const calculatePriceDiviation = (last: number, next: number) =>
  Math.abs(((next - last) * 100) / last);
