import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { approveBase18, mintToken } from './common/common.helpers';
import { depositInstantTest } from './common/deposit-vault.helpers';
import { defaultDeploy } from './common/fixtures';
import {
  addPaymentTokenTest,
  changeTokenAllowanceTest,
  setMinAmountTest,
} from './common/manageable-vault.helpers';
import { burn, mint, setMetadataTest } from './common/mTBILL.helpers';
import { redeemInstantTest } from './common/redemption-vault.helpers';

import {
  // eslint-disable-next-line camelcase
  MEdgeCustomAggregatorFeed__factory,
  // eslint-disable-next-line camelcase
  MEdgeDepositVault__factory,
  // eslint-disable-next-line camelcase,
  MEdgeRedemptionVaultWithSwapper__factory,
} from '../typechain-types';

describe('mEDGE', function () {
  it('deployment', async () => {
    const { mEDGE } = await loadFixture(defaultDeploy);

    expect(await mEDGE.name()).eq('mEDGE');
    expect(await mEDGE.symbol()).eq('mEDGE');

    expect(await mEDGE.paused()).eq(false);
  });

  it('initialize', async () => {
    const { mEDGE } = await loadFixture(defaultDeploy);

    await expect(mEDGE.initialize(ethers.constants.AddressZero)).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('pause()', () => {
    it('should fail: call from address without M_EDGE_PAUSE_OPERATOR_ROLE role', async () => {
      const { mEDGE, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(mEDGE.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mEDGE } = await loadFixture(defaultDeploy);

      await mEDGE.connect(owner).pause();
      await expect(mEDGE.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, mEDGE } = await loadFixture(defaultDeploy);
      expect(await mEDGE.paused()).eq(false);
      await expect(mEDGE.connect(owner).pause()).to.emit(
        mEDGE,
        mEDGE.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await mEDGE.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without M__PAUSE_OPERATOR_ROLE role', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await mEDGE.connect(owner).pause();
      await expect(mEDGE.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mEDGE } = await loadFixture(defaultDeploy);

      await expect(mEDGE.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, mEDGE } = await loadFixture(defaultDeploy);
      expect(await mEDGE.paused()).eq(false);
      await mEDGE.connect(owner).pause();
      expect(await mEDGE.paused()).eq(true);

      await expect(mEDGE.connect(owner).unpause()).to.emit(
        mEDGE,
        mEDGE.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await mEDGE.paused()).eq(false);
    });
  });

  describe('mint()', () => {
    it('should fail: call from address without M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await mint({ mEDGE, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mEDGE, owner }, to, amount);
    });
  });

  describe('burn()', () => {
    it('should fail: call from address without M_EDGE_BURN_OPERATOR_ROLE role', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];

      await burn({ mEDGE, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: call when user has insufficient balance', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await burn({ mEDGE, owner }, to, amount, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('call from address with M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mEDGE, owner }, to, amount);
      await burn({ mEDGE, owner }, to, amount);
    });
  });

  describe('setMetadata()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mEDGE, regularAccounts } = await loadFixture(
        defaultDeploy,
      );
      const caller = regularAccounts[0];
      await setMetadataTest({ mEDGE, owner }, 'url', 'some value', {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mEDGE } = await loadFixture(defaultDeploy);
      await setMetadataTest({ mEDGE, owner }, 'url', 'some value', undefined);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: mint(...) when address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];

      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );
      await mint({ mEDGE, owner }, blacklisted, 1, {
        revertMessage: acErrors.WMAC_HAS_ROLE,
      });
    });

    it('should fail: transfer(...) when from address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mEDGE, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );

      await expect(
        mEDGE.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transfer(...) when to address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];

      await mint({ mEDGE, owner }, from, 1);
      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );

      await expect(
        mEDGE.connect(from).transfer(blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when from address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mEDGE, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );

      await mEDGE.connect(blacklisted).approve(to.address, 1);

      await expect(
        mEDGE.connect(to).transferFrom(blacklisted.address, to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when to address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const caller = regularAccounts[2];

      await mint({ mEDGE, owner }, from, 1);

      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );
      await mEDGE.connect(from).approve(caller.address, 1);

      await expect(
        mEDGE
          .connect(caller)
          .transferFrom(from.address, blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('burn(...) when address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);
      const blacklisted = regularAccounts[0];

      await mint({ mEDGE, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );
      await burn({ mEDGE, owner }, blacklisted, 1);
    });

    it('transferFrom(...) when caller address is blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const to = regularAccounts[2];

      await mint({ mEDGE, owner }, from, 1);
      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );

      await mEDGE.connect(from).approve(blacklisted.address, 1);

      await expect(
        mEDGE.connect(blacklisted).transferFrom(from.address, to.address, 1),
      ).not.reverted;
    });

    it('transfer(...) when caller address was blacklisted and then un-blacklisted', async () => {
      const { owner, mEDGE, regularAccounts, accessControl } =
        await loadFixture(defaultDeploy);

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[2];

      await mint({ mEDGE, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );

      await expect(
        mEDGE.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);

      await unBlackList(
        { blacklistable: mEDGE, accessControl, owner },
        blacklisted,
      );

      await expect(mEDGE.connect(blacklisted).transfer(to.address, 1)).not
        .reverted;
    });
  });
});

describe('MEdgeDepositVault', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MEdgeDepositVault__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE(),
      );
    });
  });
});

describe('MEdgeRedemptionVaultWithSwapper', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MEdgeRedemptionVaultWithSwapper__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE(),
      );
    });
  });
});

describe('MEdgeCustomAggregatorFeed', () => {
  it('check admin role', async () => {
    const fixture = await loadFixture(defaultDeploy);

    // eslint-disable-next-line camelcase
    const tester = await new MEdgeCustomAggregatorFeed__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });
});
