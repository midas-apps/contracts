import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { CompositeDataFeedTest__factory } from '../../typechain-types';
import { acErrors } from '../common/ac.helpers';
import { setRoundData } from '../common/data-feed.helpers';
import { defaultDeploy } from '../common/fixtures';

describe('CompositeDataFeed', function () {
  it('deployment', async () => {
    const {
      compositeDataFeed,
      mBasisToUsdDataFeed,
      mTokenToUsdDataFeed,
      accessControl,
    } = await loadFixture(defaultDeploy);

    expect(await compositeDataFeed.accessControl()).eq(accessControl.address);
    expect(await compositeDataFeed.numeratorFeed()).eq(
      mTokenToUsdDataFeed.address,
    );
    expect(await compositeDataFeed.denominatorFeed()).eq(
      mBasisToUsdDataFeed.address,
    );
    expect(await compositeDataFeed.minExpectedAnswer()).eq(
      parseUnits('0.1', 18),
    );
    expect(await compositeDataFeed.maxExpectedAnswer()).eq(
      parseUnits('10000', 18),
    );
  });

  it('initialize', async () => {
    const { compositeDataFeed, owner } = await loadFixture(defaultDeploy);

    await expect(
      compositeDataFeed.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        0,
      ),
    ).revertedWith('Initializable: contract is already initialized');

    const dataFeedNew = await new CompositeDataFeedTest__factory(
      owner,
    ).deploy();

    await expect(
      dataFeedNew.initialize(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        0,
      ),
    ).revertedWith('CDF: invalid address');

    await expect(
      dataFeedNew.initialize(
        dataFeedNew.address,
        dataFeedNew.address,
        ethers.constants.AddressZero,
        0,
        0,
      ),
    ).revertedWith('CDF: invalid address');

    await expect(
      dataFeedNew.initialize(
        dataFeedNew.address,
        dataFeedNew.address,
        dataFeedNew.address,
        2,
        1,
      ),
    ).revertedWith('CDF: invalid exp. prices');
  });

  describe('changeNumeratorFeed()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
      const { compositeDataFeed, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        compositeDataFeed
          .connect(regularAccounts[0])
          .changeNumeratorFeed(ethers.constants.AddressZero),
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
    });

    it('should fail: pass zero address', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);

      await expect(
        compositeDataFeed.changeNumeratorFeed(ethers.constants.AddressZero),
      ).revertedWith('CDF: invalid address');
    });

    it('pass new aggregator address', async () => {
      const { compositeDataFeed, mTokenToUsdDataFeed } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        compositeDataFeed.changeNumeratorFeed(mTokenToUsdDataFeed.address),
      ).not.reverted;
    });
  });

  describe('changeDenominatorFeed()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
      const { compositeDataFeed, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        compositeDataFeed
          .connect(regularAccounts[0])
          .changeDenominatorFeed(ethers.constants.AddressZero),
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
    });

    it('should fail: pass zero address', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);

      await expect(
        compositeDataFeed.changeDenominatorFeed(ethers.constants.AddressZero),
      ).revertedWith('CDF: invalid address');
    });

    it('pass new aggregator address', async () => {
      const { compositeDataFeed, mTokenToUsdDataFeed } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        compositeDataFeed.changeDenominatorFeed(mTokenToUsdDataFeed.address),
      ).not.reverted;
    });
  });

  describe('setMinExpectedAnswer', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
      const { compositeDataFeed, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        compositeDataFeed
          .connect(regularAccounts[0])
          .setMinExpectedAnswer(parseUnits('1')),
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
    });

    it('should fail: pass value more than max expected answer', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);

      await expect(
        compositeDataFeed.setMinExpectedAnswer(parseUnits('10001')),
      ).revertedWith('CDF: invalid exp. prices');
    });

    it('pass new value', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);

      await expect(compositeDataFeed.setMinExpectedAnswer(parseUnits('1'))).not
        .reverted;
      expect(await compositeDataFeed.minExpectedAnswer()).eq(parseUnits('1'));
    });

    it('when new value equals max expected answer', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);
      await compositeDataFeed.setMaxExpectedAnswer(parseUnits('1000'));

      await expect(compositeDataFeed.setMinExpectedAnswer(parseUnits('1000')))
        .not.reverted;
      expect(await compositeDataFeed.minExpectedAnswer()).eq(
        parseUnits('1000'),
      );
    });
  });

  describe('setMaxExpectedAnswer', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
      const { compositeDataFeed, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        compositeDataFeed
          .connect(regularAccounts[0])
          .setMaxExpectedAnswer(parseUnits('1')),
      ).revertedWith(acErrors.WMAC_HASNT_ROLE);
    });

    it('should fail: pass value less than min expected answer', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);

      await expect(
        compositeDataFeed.setMaxExpectedAnswer(parseUnits('0.099')),
      ).revertedWith('CDF: invalid exp. prices');
    });

    it('pass new value', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);

      await expect(compositeDataFeed.setMaxExpectedAnswer(parseUnits('100')))
        .not.reverted;
      expect(await compositeDataFeed.maxExpectedAnswer()).eq(parseUnits('100'));
    });

    it('when new value equals min expected answer', async () => {
      const { compositeDataFeed } = await loadFixture(defaultDeploy);
      await compositeDataFeed.setMinExpectedAnswer(parseUnits('1'));

      await expect(compositeDataFeed.setMaxExpectedAnswer(parseUnits('1'))).not
        .reverted;
      expect(await compositeDataFeed.maxExpectedAnswer()).eq(parseUnits('1'));
    });
  });

  describe('getDataInBase18()', () => {
    it('when num. = 2$ and denom. = 1$', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 2);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1);
      expect(await compositeDataFeed.getDataInBase18()).eq(parseUnits('2'));
    });

    it('when num. = 1$ and denom. = 2$', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2);
      expect(await compositeDataFeed.getDataInBase18()).eq(parseUnits('0.5'));
    });

    it('when num. = 1.5$ and denom. = 2.1$', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1.5);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 2.1);
      expect(await compositeDataFeed.getDataInBase18()).eq(
        parseUnits('0.714285714285714285'),
      );
    });

    it('when answer equals to min expected answer', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1);
      await compositeDataFeed.setMinExpectedAnswer(parseUnits('1'));
      expect(await compositeDataFeed.getDataInBase18()).eq(parseUnits('1'));
    });

    it('when answer equals to max expected answer', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1000);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1);
      await compositeDataFeed.setMaxExpectedAnswer(parseUnits('1000'));
      expect(await compositeDataFeed.getDataInBase18()).eq(parseUnits('1000'));
    });

    it('should fail: when answer > max expected answer', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 1001);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1);
      await compositeDataFeed.setMaxExpectedAnswer(parseUnits('1000'));
      await expect(compositeDataFeed.getDataInBase18()).to.be.revertedWith(
        'CDF: feed is unhealthy',
      );
    });
    it('should fail: when answer < min expected answer', async () => {
      const {
        compositeDataFeed,
        mockedAggregatorMBasis,
        mockedAggregatorMToken,
      } = await loadFixture(defaultDeploy);
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0.999);
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 1);
      await compositeDataFeed.setMinExpectedAnswer(parseUnits('1'));
      await expect(compositeDataFeed.getDataInBase18()).to.be.revertedWith(
        'CDF: feed is unhealthy',
      );
    });

    it('should fail when: num. feed is unhealthy ', async () => {
      const { compositeDataFeed, mockedAggregatorMToken } = await loadFixture(
        defaultDeploy,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMToken }, 0.01);
      await expect(compositeDataFeed.getDataInBase18()).to.be.revertedWith(
        'DF: feed is unhealthy',
      );
    });

    it('should fail when: denom. feed is unhealthy', async () => {
      const { compositeDataFeed, mockedAggregatorMBasis } = await loadFixture(
        defaultDeploy,
      );
      await setRoundData({ mockedAggregator: mockedAggregatorMBasis }, 0.01);
      await expect(compositeDataFeed.getDataInBase18()).to.be.revertedWith(
        'DF: feed is unhealthy',
      );
    });
  });
});
