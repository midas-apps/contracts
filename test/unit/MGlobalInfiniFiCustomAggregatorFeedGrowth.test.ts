import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits, solidityKeccak256 } from 'ethers/lib/utils';
import { ethers, upgrades } from 'hardhat';

import {
  MGlobalInfiniFiCustomAggregatorFeedGrowth,
  MGlobalInfiniFiCustomAggregatorFeedGrowth__factory,
  MidasAccessControlTest__factory,
} from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';

const PARAMS = {
  minAnswer: parseUnits('0.1', 8),
  maxAnswer: parseUnits('2', 8),
  maxAnswerDeviation: parseUnits('1', 8),
  minGrowthApr: parseUnits('0', 8),
  maxGrowthApr: parseUnits('7.24', 8),
  onlyUp: true,
  description: 'infiniFi MG Yield Oracle',
} as const;

const EXPECTED_ROLE = solidityKeccak256(
  ['string'],
  ['INFINIFI_MG_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE'],
);

const deployFixture = async () => {
  const [owner, infinifiAdmin, stranger] = await ethers.getSigners();

  const accessControl = await new MidasAccessControlTest__factory(
    owner,
  ).deploy();
  await accessControl.initialize();

  const feed = (await upgrades.deployProxy(
    new MGlobalInfiniFiCustomAggregatorFeedGrowth__factory(owner),
    [
      accessControl.address,
      PARAMS.minAnswer,
      PARAMS.maxAnswer,
      PARAMS.maxAnswerDeviation,
      PARAMS.minGrowthApr,
      PARAMS.maxGrowthApr,
      PARAMS.onlyUp,
      PARAMS.description,
    ],
  )) as MGlobalInfiniFiCustomAggregatorFeedGrowth;

  return { owner, infinifiAdmin, stranger, accessControl, feed };
};

describe('MGlobalInfiniFiCustomAggregatorFeedGrowth', () => {
  it('initializes with the InfiniFi ticket parameters', async () => {
    const { feed } = await loadFixture(deployFixture);

    expect(await feed.description()).eq(PARAMS.description);
    expect(await feed.decimals()).eq(8);
    expect(await feed.version()).eq(1);
    expect(await feed.minAnswer()).eq(PARAMS.minAnswer);
    expect(await feed.maxAnswer()).eq(PARAMS.maxAnswer);
    expect(await feed.maxAnswerDeviation()).eq(PARAMS.maxAnswerDeviation);
    expect(await feed.minGrowthApr()).eq(PARAMS.minGrowthApr);
    expect(await feed.maxGrowthApr()).eq(PARAMS.maxGrowthApr);
    expect(await feed.onlyUp()).eq(PARAMS.onlyUp);
  });

  it('exposes the dedicated INFINIFI_MG role and the constant matches its keccak preimage', async () => {
    const { feed } = await loadFixture(deployFixture);

    expect(await feed.feedAdminRole()).eq(EXPECTED_ROLE);
    expect(await feed.INFINIFI_MG_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE()).eq(
      EXPECTED_ROLE,
    );
    expect(await feed.feedAdminRole()).not.eq(
      await feed.M_GLOBAL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });

  it('rejects setRoundData from a caller without the InfiniFi role', async () => {
    const { feed, stranger } = await loadFixture(deployFixture);

    const ts = (await ethers.provider.getBlock('latest')).timestamp - 1;

    await expect(
      feed.connect(stranger).setRoundData(parseUnits('1', 8), ts, 0),
    ).revertedWith(acErrors.WMAC_HASNT_ROLE);
  });

  it('accepts setRoundData from a caller granted the InfiniFi role and seeds $1.00 / 0% APR', async () => {
    const { feed, accessControl, owner, infinifiAdmin } = await loadFixture(
      deployFixture,
    );

    await accessControl
      .connect(owner)
      .grantRole(EXPECTED_ROLE, infinifiAdmin.address);

    const ts = (await ethers.provider.getBlock('latest')).timestamp - 1;

    await expect(
      feed
        .connect(infinifiAdmin)
        .setRoundData(parseUnits('1', 8), ts, parseUnits('0', 8)),
    ).to.emit(feed, 'AnswerUpdated');

    const [, answer, , , , growthApr] = await feed.latestRoundDataRaw();
    expect(answer).eq(parseUnits('1', 8));
    expect(growthApr).eq(0);
  });

  it('enforces growth APR bounds: rejects > maxGrowthApr (7.24%)', async () => {
    const { feed, accessControl, owner, infinifiAdmin } = await loadFixture(
      deployFixture,
    );

    await accessControl
      .connect(owner)
      .grantRole(EXPECTED_ROLE, infinifiAdmin.address);

    const ts = (await ethers.provider.getBlock('latest')).timestamp - 1;

    await expect(
      feed
        .connect(infinifiAdmin)
        .setRoundData(parseUnits('1', 8), ts, PARAMS.maxGrowthApr.add(1)),
    ).revertedWith('CAG: out of [min;max] growth');
  });

  it('enforces growth APR bounds: rejects negative APR (minGrowthApr = 0)', async () => {
    const { feed, accessControl, owner, infinifiAdmin } = await loadFixture(
      deployFixture,
    );

    await accessControl
      .connect(owner)
      .grantRole(EXPECTED_ROLE, infinifiAdmin.address);

    const ts = (await ethers.provider.getBlock('latest')).timestamp - 1;

    await expect(
      feed.connect(infinifiAdmin).setRoundData(parseUnits('1', 8), ts, -1),
    ).revertedWith('CAG: out of [min;max] growth');
  });
});
