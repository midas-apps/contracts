import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  DeployDataFeedConfigComposite,
  DeployDataFeedConfigRegular,
  getPaymentTokenDataFeedTarget,
} from '../../../scripts/deploy/common/data-feed';

describe('PaymentTokenDataFeedTarget', function () {
  describe('getPaymentTokenDataFeedTarget', function () {
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
        getPaymentTokenDataFeedTarget(regularAddresses, regularConfig),
      ).deep.eq({
        kind: 'regular',
        addresses: regularAddresses,
        config: regularConfig,
      });
    });

    it('returns the composite data feed for a composite token', () => {
      expect(
        getPaymentTokenDataFeedTarget(compositeAddresses, compositeConfig),
      ).deep.eq({
        kind: 'composite',
        addresses: compositeAddresses,
        config: compositeConfig,
      });
    });

    it('returns the composite data feed for a multiply feed type', () => {
      const multiplyConfig: DeployDataFeedConfigComposite = {
        ...compositeConfig,
        feedType: 'multiply',
      };

      expect(
        getPaymentTokenDataFeedTarget(compositeAddresses, multiplyConfig),
      ).deep.eq({
        kind: 'composite',
        addresses: compositeAddresses,
        config: multiplyConfig,
      });
    });

    it('treats addresses with only a numerator as composite', () => {
      const numeratorOnlyAddresses = {
        numerator: compositeAddresses.numerator,
        dataFeed: compositeAddresses.dataFeed,
      };

      expect(
        getPaymentTokenDataFeedTarget(numeratorOnlyAddresses, compositeConfig),
      ).deep.eq({
        kind: 'composite',
        addresses: numeratorOnlyAddresses,
        config: compositeConfig,
      });
    });

    it('does not require the data feed address (deploy creates it)', () => {
      expect(
        getPaymentTokenDataFeedTarget(
          { ...regularAddresses, dataFeed: undefined },
          regularConfig,
        ).kind,
      ).eq('regular');
    });

    it('throws when config is composite but addresses are regular', () => {
      expect(() =>
        getPaymentTokenDataFeedTarget(regularAddresses, compositeConfig),
      ).to.throw('Data feed config and addresses have different types');
    });

    it('throws when config is regular but addresses are composite', () => {
      expect(() =>
        getPaymentTokenDataFeedTarget(compositeAddresses, regularConfig),
      ).to.throw('Data feed config and addresses have different types');
    });

    it('throws when config is regular but addresses have only a denominator', () => {
      expect(() =>
        getPaymentTokenDataFeedTarget(
          {
            denominator: compositeAddresses.denominator,
            dataFeed: compositeAddresses.dataFeed,
          },
          regularConfig,
        ),
      ).to.throw('Data feed config and addresses have different types');
    });

    describe('with aggregatorType', () => {
      it('returns the numerator sub-feed addresses and config', () => {
        expect(
          getPaymentTokenDataFeedTarget(
            compositeAddresses,
            compositeConfig,
            'numerator',
          ),
        ).deep.eq({
          kind: 'regular',
          addresses: compositeAddresses.numerator,
          config: compositeConfig.numerator,
        });
      });

      it('returns the denominator sub-feed addresses and config', () => {
        expect(
          getPaymentTokenDataFeedTarget(
            compositeAddresses,
            compositeConfig,
            'denominator',
          ),
        ).deep.eq({
          kind: 'regular',
          addresses: compositeAddresses.denominator,
          config: compositeConfig.denominator,
        });
      });

      it('resolves the sub-feed even when the composite data feed is not set', () => {
        expect(
          getPaymentTokenDataFeedTarget(
            { ...compositeAddresses, dataFeed: undefined },
            compositeConfig,
            'numerator',
          ),
        ).deep.eq({
          kind: 'regular',
          addresses: compositeAddresses.numerator,
          config: compositeConfig.numerator,
        });
      });

      it('throws for a regular token', () => {
        expect(() =>
          getPaymentTokenDataFeedTarget(
            regularAddresses,
            regularConfig,
            'numerator',
          ),
        ).to.throw('aggregatorType is only supported for composite feeds');
      });

      it('throws when the sub-feed addresses are not set', () => {
        expect(() =>
          getPaymentTokenDataFeedTarget(
            {
              numerator: compositeAddresses.numerator,
              dataFeed: compositeAddresses.dataFeed,
            },
            compositeConfig,
            'denominator',
          ),
        ).to.throw('denominator data feed config or addresses are not set');
      });

      it('throws when the sub-feed config is not set', () => {
        const numeratorOnlyConfig = {
          numerator: compositeConfig.numerator,
          feedType: 'composite',
        } as DeployDataFeedConfigComposite;

        expect(() =>
          getPaymentTokenDataFeedTarget(
            compositeAddresses,
            numeratorOnlyConfig,
            'denominator',
          ),
        ).to.throw('denominator data feed config or addresses are not set');
      });

      it('throws when config and addresses have different types', () => {
        expect(() =>
          getPaymentTokenDataFeedTarget(
            compositeAddresses,
            regularConfig,
            'numerator',
          ),
        ).to.throw('Data feed config and addresses have different types');
      });
    });
  });
});
