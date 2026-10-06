import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  DeployDataFeedConfigComposite,
  DeployDataFeedConfigRegular,
  getPaymentTokenExpectedAnswersTarget,
} from '../../scripts/deploy/common/data-feed';

describe('getPaymentTokenExpectedAnswersTarget', function () {
  const regularConfig: DeployDataFeedConfigRegular = {
    healthyDiff: constants.MaxUint256,
    minAnswer: parseUnits('0.9999', 8),
    maxAnswer: parseUnits('1', 8),
  };

  const compositeConfig: DeployDataFeedConfigComposite = {
    numerator: {
      healthyDiff: 25 * 60 * 60,
      minAnswer: 1,
      maxAnswer: constants.MaxInt256,
    },
    denominator: {
      healthyDiff: 24 * 60 * 60,
      minAnswer: 2,
      maxAnswer: constants.MaxInt256,
    },
    feedType: 'composite',
    minAnswer: parseUnits('0.997'),
    maxAnswer: parseUnits('1.003'),
  };

  const regularAddresses = {
    aggregator: '0x0000000000000000000000000000000000000001',
    dataFeed: '0x0000000000000000000000000000000000000002',
  };

  const compositeAddresses = {
    numerator: {
      aggregator: '0x0000000000000000000000000000000000000003',
      dataFeed: '0x0000000000000000000000000000000000000004',
    },
    denominator: {
      aggregator: '0x0000000000000000000000000000000000000005',
      dataFeed: '0x0000000000000000000000000000000000000006',
    },
    dataFeed: '0x0000000000000000000000000000000000000007',
  };

  it('returns the regular data feed for a regular token', () => {
    expect(
      getPaymentTokenExpectedAnswersTarget(regularAddresses, regularConfig),
    ).deep.eq({
      kind: 'regular',
      dataFeedAddress: regularAddresses.dataFeed,
      config: regularConfig,
    });
  });

  it('returns the composite data feed for a composite token', () => {
    expect(
      getPaymentTokenExpectedAnswersTarget(compositeAddresses, compositeConfig),
    ).deep.eq({
      kind: 'composite',
      dataFeedAddress: compositeAddresses.dataFeed,
      config: compositeConfig,
    });
  });

  it('throws when the data feed address is not set', () => {
    expect(() =>
      getPaymentTokenExpectedAnswersTarget(
        { ...regularAddresses, dataFeed: undefined },
        regularConfig,
      ),
    ).to.throw('Data feed address is not set');
  });

  it('throws when config is composite but addresses are regular', () => {
    expect(() =>
      getPaymentTokenExpectedAnswersTarget(regularAddresses, compositeConfig),
    ).to.throw('Data feed config and addresses have different types');
  });

  it('throws when config is regular but addresses are composite', () => {
    expect(() =>
      getPaymentTokenExpectedAnswersTarget(compositeAddresses, regularConfig),
    ).to.throw('Data feed config and addresses have different types');
  });

  it('throws when composite sub-feeds are set but the composite data feed is not', () => {
    expect(() =>
      getPaymentTokenExpectedAnswersTarget(
        { ...compositeAddresses, dataFeed: undefined },
        compositeConfig,
      ),
    ).to.throw('Data feed address is not set');
  });

  it('throws when the data feed address is an empty string', () => {
    expect(() =>
      getPaymentTokenExpectedAnswersTarget(
        { ...regularAddresses, dataFeed: '' },
        regularConfig,
      ),
    ).to.throw('Data feed address is not set');
  });

  it('returns the composite data feed for a multiply feed type', () => {
    const multiplyConfig: DeployDataFeedConfigComposite = {
      ...compositeConfig,
      feedType: 'multiply',
    };

    expect(
      getPaymentTokenExpectedAnswersTarget(compositeAddresses, multiplyConfig),
    ).deep.eq({
      kind: 'composite',
      dataFeedAddress: compositeAddresses.dataFeed,
      config: multiplyConfig,
    });
  });

  it('treats addresses with only a numerator as composite', () => {
    const numeratorOnlyAddresses = {
      numerator: compositeAddresses.numerator,
      dataFeed: compositeAddresses.dataFeed,
    };

    expect(
      getPaymentTokenExpectedAnswersTarget(
        numeratorOnlyAddresses,
        compositeConfig,
      ),
    ).deep.eq({
      kind: 'composite',
      dataFeedAddress: compositeAddresses.dataFeed,
      config: compositeConfig,
    });
  });

  it('throws when config is regular but addresses have only a denominator', () => {
    expect(() =>
      getPaymentTokenExpectedAnswersTarget(
        {
          denominator: compositeAddresses.denominator,
          dataFeed: compositeAddresses.dataFeed,
        },
        regularConfig,
      ),
    ).to.throw('Data feed config and addresses have different types');
  });
});
