import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';
import { burn, mint, setMetadataTest } from './common/mTBILL.helpers';

import {
  // eslint-disable-next-line camelcase
  MMevCustomAggregatorFeed__factory,
  // eslint-disable-next-line camelcase
  MMevDataFeed__factory,
  // eslint-disable-next-line camelcase
  MMevDepositVault__factory,
  // eslint-disable-next-line camelcase
  MMevRedemptionVaultWithSwapper__factory,
} from '../typechain-types';

describe('mMEV', function () {
  it('deployment', async () => {
    const { mMEV } = await loadFixture(defaultDeploy);

    expect(await mMEV.name()).eq('Midas MEV');
    expect(await mMEV.symbol()).eq('mMEV');

    expect(await mMEV.paused()).eq(false);
  });

  it('initialize', async () => {
    const { mMEV } = await loadFixture(defaultDeploy);

    await expect(mMEV.initialize(ethers.constants.AddressZero)).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('pause()', () => {
    it('should fail: call from address without M_EDGE_PAUSE_OPERATOR_ROLE role', async () => {
      const { mMEV, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(mMEV.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mMEV } = await loadFixture(defaultDeploy);

      await mMEV.connect(owner).pause();
      await expect(mMEV.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, mMEV } = await loadFixture(defaultDeploy);
      expect(await mMEV.paused()).eq(false);
      await expect(mMEV.connect(owner).pause()).to.emit(
        mMEV,
        mMEV.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await mMEV.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without M__PAUSE_OPERATOR_ROLE role', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await mMEV.connect(owner).pause();
      await expect(mMEV.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mMEV } = await loadFixture(defaultDeploy);

      await expect(mMEV.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, mMEV } = await loadFixture(defaultDeploy);
      expect(await mMEV.paused()).eq(false);
      await mMEV.connect(owner).pause();
      expect(await mMEV.paused()).eq(true);

      await expect(mMEV.connect(owner).unpause()).to.emit(
        mMEV,
        mMEV.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await mMEV.paused()).eq(false);
    });
  });

  describe('mint()', () => {
    it('should fail: call from address without M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await mint({ mMEV, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mMEV, owner }, to, amount);
    });
  });

  describe('burn()', () => {
    it('should fail: call from address without M_EDGE_BURN_OPERATOR_ROLE role', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await burn({ mMEV, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: call when user has insufficient balance', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await burn({ mMEV, owner }, to, amount, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('call from address with M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mMEV, owner }, to, amount);
      await burn({ mMEV, owner }, to, amount);
    });
  });

  describe('setMetadata()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mMEV, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];
      await setMetadataTest({ mMEV, owner }, 'url', 'some value', {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mMEV } = await loadFixture(defaultDeploy);
      await setMetadataTest({ mMEV, owner }, 'url', 'some value', undefined);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: mint(...) when address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];

      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );
      await mint({ mMEV, owner }, blacklisted, 1, {
        revertMessage: acErrors.WMAC_HAS_ROLE,
      });
    });

    it('should fail: transfer(...) when from address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mMEV, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );

      await expect(
        mMEV.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transfer(...) when to address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];

      await mint({ mMEV, owner }, from, 1);
      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );

      await expect(
        mMEV.connect(from).transfer(blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when from address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mMEV, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );

      await mMEV.connect(blacklisted).approve(to.address, 1);

      await expect(
        mMEV.connect(to).transferFrom(blacklisted.address, to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when to address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const caller = regularAccounts[2];

      await mint({ mMEV, owner }, from, 1);

      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );
      await mMEV.connect(from).approve(caller.address, 1);

      await expect(
        mMEV.connect(caller).transferFrom(from.address, blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('burn(...) when address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];

      await mint({ mMEV, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );
      await burn({ mMEV, owner }, blacklisted, 1);
    });

    it('transferFrom(...) when caller address is blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const to = regularAccounts[2];

      await mint({ mMEV, owner }, from, 1);
      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );

      await mMEV.connect(from).approve(blacklisted.address, 1);

      await expect(
        mMEV.connect(blacklisted).transferFrom(from.address, to.address, 1),
      ).not.reverted;
    });

    it('transfer(...) when caller address was blacklisted and then un-blacklisted', async () => {
      const { owner, mMEV, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[2];

      await mint({ mMEV, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );

      await expect(
        mMEV.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);

      await unBlackList(
        { blacklistable: mMEV, accessControl, owner },
        blacklisted,
      );

      await expect(mMEV.connect(blacklisted).transfer(to.address, 1)).not
        .reverted;
    });
  });
});

describe('MMevDepositVault', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MMevDepositVault__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_MEV_DEPOSIT_VAULT_ADMIN_ROLE(),
      );
    });
  });
});

describe('MMevRedemptionVault', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MMevRedemptionVaultWithSwapper__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_MEV_REDEMPTION_VAULT_ADMIN_ROLE(),
      );
    });
  });
});

describe('MMevCustomAggregatorFeed', () => {
  it('check admin role', async () => {
    const fixture = await loadFixture(defaultDeploy);

    // eslint-disable-next-line camelcase
    const tester = await new MMevCustomAggregatorFeed__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });
});

describe('MMevDataFeed', () => {
  it('check admin role', async () => {
    const fixture = await loadFixture(defaultDeploy);

    // eslint-disable-next-line camelcase
    const tester = await new MMevDataFeed__factory(fixture.owner).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });
});
