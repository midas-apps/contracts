import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

import {
  amountToBase18,
  handleRevert,
  OptionalCommonParams,
} from './common.helpers';
import { defaultDeploy } from './fixtures';

type CommonParams = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'mockedAggregator'
>;

type CommonParamsSetHealthyDiff = Pick<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'dataFeed' | 'owner'
>;

export const setHealthyDiffTest = async (
  { dataFeed, owner }: CommonParamsSetHealthyDiff,
  healthyDiff: BigNumberish,
  opt?: OptionalCommonParams,
) => {
  const sender: SignerWithAddress = opt?.from ?? owner;

  if (
    await handleRevert(
      () => dataFeed.connect(sender).setHealthyDiff(healthyDiff),
      dataFeed,
      opt,
    )
  ) {
    return;
  }

  await expect(dataFeed.connect(sender).setHealthyDiff(healthyDiff)).not
    .reverted;

  expect(await dataFeed.healthyDiff()).eq(healthyDiff);
};

export const setRoundData = async (
  { mockedAggregator }: CommonParams,
  newPrice: number,
) => {
  const decimals = await mockedAggregator.decimals();
  const parsedPrice = parseUnits(newPrice.toString(), decimals);
  await mockedAggregator.setRoundData(parsedPrice);
  return amountToBase18(decimals, parsedPrice);
};

export const getRoundData = async ({ mockedAggregator }: CommonParams) => {
  const decimals = await mockedAggregator.decimals();
  const data = await mockedAggregator.latestRoundData();
  return amountToBase18(decimals, data.answer).then((v) => +formatUnits(v));
};
