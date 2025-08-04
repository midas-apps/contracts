import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { BigNumber, BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { OptionalCommonParams } from './common.helpers';
import { defaultDeploy } from './fixtures';

type CommonParamsSetRoundData = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'customFeedGrowth' | 'owner'
>;

export const setOnlyUp = async (
  { customFeedGrowth, owner }: CommonParamsSetRoundData,
  newOnlyUp: boolean,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  if (opt?.revertMessage) {
    await expect(
      customFeedGrowth.connect(sender).setOnlyUp(newOnlyUp),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(customFeedGrowth.connect(sender).setOnlyUp(newOnlyUp))
    .to.emit(
      customFeedGrowth,
      customFeedGrowth.interface.events['OnlyUpUpdated(bool)'].name,
    )
    .withArgs(newOnlyUp).to.not.reverted;

  const onlyUp = await customFeedGrowth.onlyUp();
  expect(onlyUp).eq(newOnlyUp);
};

export const setMinGrowthApr = async (
  { customFeedGrowth, owner }: CommonParamsSetRoundData,
  newMinGrowthApr: number,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const newMinGrowthAprParsed = parseUnits(
    newMinGrowthApr.toFixed(8).replace(/\.?0+$/, ''),
    8,
  );

  if (opt?.revertMessage) {
    await expect(
      customFeedGrowth.connect(sender).setMinGrowthApr(newMinGrowthAprParsed),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    customFeedGrowth.connect(sender).setMinGrowthApr(newMinGrowthAprParsed),
  )
    .to.emit(
      customFeedGrowth,
      customFeedGrowth.interface.events['MinGrowthAprUpdated(int80)'].name,
    )
    .withArgs(newMinGrowthAprParsed).to.not.reverted;

  const minGrowthApr = await customFeedGrowth.minGrowthApr();
  expect(minGrowthApr).eq(newMinGrowthAprParsed);
};

export const setMaxGrowthApr = async (
  { customFeedGrowth, owner }: CommonParamsSetRoundData,
  newMaxGrowthApr: number,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const newMaxGrowthAprParsed = parseUnits(
    newMaxGrowthApr.toFixed(8).replace(/\.?0+$/, ''),
    8,
  );

  if (opt?.revertMessage) {
    await expect(
      customFeedGrowth.connect(sender).setMaxGrowthApr(newMaxGrowthAprParsed),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    customFeedGrowth.connect(sender).setMaxGrowthApr(newMaxGrowthAprParsed),
  )
    .to.emit(
      customFeedGrowth,
      customFeedGrowth.interface.events['MaxGrowthAprUpdated(int80)'].name,
    )
    .withArgs(newMaxGrowthAprParsed).to.not.reverted;

  const maxGrowthApr = await customFeedGrowth.maxGrowthApr();
  expect(maxGrowthApr).eq(newMaxGrowthAprParsed);
};

export const setRoundDataGrowth = async (
  {
    customFeedGrowth,
    owner,
    useSafe = false,
    expectedAnswer,
  }: CommonParamsSetRoundData & {
    useSafe?: boolean;
    expectedAnswer?: number;
  },
  data: number,
  timestampDelta: number,
  growthApr: number,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;

  const dataParsed = parseUnits(data.toFixed(8).replace(/\.?0+$/, ''), 8);
  const growthParsed = parseUnits(
    growthApr.toFixed(8).replace(/\.?0+$/, ''),
    8,
  );

  const expectedAnswerParsed = expectedAnswer
    ? parseUnits(expectedAnswer.toFixed(8).replace(/\.?0+$/, ''), 8)
    : undefined;

  const timestampBefore = (await customFeedGrowth.provider.getBlock('latest'))
    .timestamp;

  const timestamp = timestampBefore + timestampDelta + 10;

  const nextTimestamp = timestampBefore + 10;

  const callFn = useSafe
    ? customFeedGrowth
        .connect(sender)
        .setRoundDataSafe.bind(this, dataParsed, timestamp, growthParsed)
    : customFeedGrowth
        .connect(sender)
        .setRoundData.bind(this, dataParsed, timestamp, growthParsed);

  if (opt?.revertMessage) {
    await expect(callFn()).revertedWith(opt?.revertMessage);
    return;
  }

  const lastRoundIdBefore = await customFeedGrowth.latestRound();
  const lastRoundDataBefore = await customFeedGrowth.latestRoundData();

  await setNextBlockTimestamp(nextTimestamp);

  await expect(callFn())
    .to.emit(
      customFeedGrowth,
      customFeedGrowth.interface.events[
        'AnswerUpdated(int256,uint256,uint256,int80)'
      ].name,
    )
    .withArgs(dataParsed, lastRoundIdBefore.add(1), timestamp, growthParsed).to
    .not.reverted;

  const timestampAfter = (await customFeedGrowth.provider.getBlock('latest'))
    .timestamp;

  const expectedNextAnswer =
    expectedAnswerParsed ??
    applyGrowth({
      answer: dataParsed,
      growthApr: growthParsed,
      timestampFrom: timestamp,
      timestampTo: timestampAfter,
    });

  const lastRoundIdAfter = await customFeedGrowth.latestRound();
  const lastRoundDataAfter = await customFeedGrowth.latestRoundData();
  const lastRoundDataRawAfter = await customFeedGrowth.latestRoundDataRaw();

  const roundDataAfter = await customFeedGrowth.getRoundData(lastRoundIdAfter);

  const roundDataRawAfter = await customFeedGrowth.getRoundDataRaw(
    lastRoundDataRawAfter.roundId,
  );

  const lastUpdatedAt = await customFeedGrowth.lastTimestamp();
  const lastStartedAt = await customFeedGrowth.lastStartedAt();

  expect(lastUpdatedAt).eq(timestampAfter);
  expect(lastStartedAt).eq(timestamp);
  expect(lastRoundIdAfter).eq(lastRoundIdBefore.add(1));
  expect(lastRoundDataAfter.roundId).eq(lastRoundDataBefore.roundId.add(1));
  expect(lastRoundDataRawAfter.roundId).eq(lastRoundDataAfter.roundId);
  expect(lastRoundDataAfter.answeredInRound).eq(
    lastRoundDataBefore.answeredInRound.add(1),
  );
  expect(lastRoundDataRawAfter.answeredInRound).eq(
    lastRoundDataAfter.answeredInRound,
  );

  expect(lastRoundDataAfter.startedAt).eq(timestamp);
  expect(lastRoundDataRawAfter.startedAt).eq(timestamp);

  expect(lastRoundDataAfter.updatedAt).eq(timestampAfter);
  expect(lastRoundDataRawAfter.updatedAt).eq(timestampAfter);

  expect(lastRoundDataAfter.answer).eq(expectedNextAnswer);
  expect(lastRoundDataRawAfter.answer).eq(dataParsed);

  expect(lastRoundDataAfter.answer).eq(expectedNextAnswer);
  expect(lastRoundDataRawAfter.answer).eq(dataParsed);
  expect(lastRoundDataAfter.updatedAt).eq(roundDataAfter.updatedAt);
  expect(lastRoundDataRawAfter.updatedAt).eq(roundDataRawAfter.updatedAt);
  expect(lastRoundDataAfter.startedAt).eq(roundDataAfter.startedAt);
  expect(lastRoundDataRawAfter.startedAt).eq(roundDataRawAfter.startedAt);
  expect(lastRoundDataAfter.roundId).eq(roundDataAfter.roundId);
  expect(lastRoundDataRawAfter.roundId).eq(roundDataRawAfter.roundId);
  expect(lastRoundDataAfter.answeredInRound).eq(roundDataAfter.answeredInRound);
  expect(lastRoundDataRawAfter.answeredInRound).eq(
    roundDataRawAfter.answeredInRound,
  );

  expect(await customFeedGrowth.lastTimestamp()).eq(
    lastRoundDataAfter.updatedAt,
  );
  expect(await customFeedGrowth.lastStartedAt()).eq(
    lastRoundDataAfter.startedAt,
  );

  expect(await customFeedGrowth.lastAnswer()).eq(expectedNextAnswer);
};

export const setRoundDataSafeGrowth = async (
  {
    customFeedGrowth,
    owner,
    expectedAnswer,
  }: CommonParamsSetRoundData & {
    expectedAnswer?: number;
  },
  data: number,
  timestampDelta: number,
  growthApr: number,
  opt?: OptionalCommonParams,
) => {
  if (opt?.revertMessage) {
    await setRoundDataGrowth(
      {
        customFeedGrowth,
        owner,
        expectedAnswer,
        useSafe: true,
      },
      data,
      timestampDelta,
      growthApr,
      opt,
    );
    return;
  }

  await setRoundDataGrowth(
    {
      customFeedGrowth,
      owner,
      expectedAnswer,
      useSafe: true,
    },
    data,
    timestampDelta,
    growthApr,
    opt,
  );
};

export const applyGrowth = ({
  answer,
  growthApr,
  timestampFrom,
  timestampTo,
}: {
  answer: BigNumberish;
  growthApr: BigNumberish;
  timestampFrom: number;
  timestampTo: number;
}) => {
  const passedSeconds = timestampTo - timestampFrom;
  const interest = BigNumber.from(answer)
    .mul(passedSeconds)
    .mul(growthApr)
    .div(
      BigNumber.from(100)
        .mul(10 ** 8)
        .mul(365)
        .mul(86400),
    );

  return BigNumber.from(answer).add(interest);
};

export const calculatePriceDiviation = (last: number, next: number) =>
  Math.abs(((next - last) * 100) / last);
