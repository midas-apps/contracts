import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';

import { burn, mint, setMetadataTest } from './common/mTBILL.helpers';

import {
  // eslint-disable-next-line camelcase
  MRe7CustomAggregatorFeed__factory,
  MRe7DataFeed__factory,
  MRe7DepositVault__factory,
} from '../typechain-types';

describe('mRE7', function () {
  it('deployment', async () => {
    const { mRE7 } = await loadFixture(defaultDeploy);

    expect(await mRE7.name()).eq('Midas mRE7');
    expect(await mRE7.symbol()).eq('mRE7');

    expect(await mRE7.paused()).eq(false);
  });

  it('initialize', async () => {
    const { mRE7 } = await loadFixture(defaultDeploy);

    await expect(mRE7.initialize(ethers.constants.AddressZero)).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('pause()', () => {
    it('should fail: call from address without M_EDGE_PAUSE_OPERATOR_ROLE role', async () => {
      const { mRE7, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(mRE7.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mRE7 } = await loadFixture(defaultDeploy);

      await mRE7.connect(owner).pause();
      await expect(mRE7.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, mRE7 } = await loadFixture(defaultDeploy);
      expect(await mRE7.paused()).eq(false);
      await expect(mRE7.connect(owner).pause()).to.emit(
        mRE7,
        mRE7.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await mRE7.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without M__PAUSE_OPERATOR_ROLE role', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await mRE7.connect(owner).pause();
      await expect(mRE7.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mRE7 } = await loadFixture(defaultDeploy);

      await expect(mRE7.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, mRE7 } = await loadFixture(defaultDeploy);
      expect(await mRE7.paused()).eq(false);
      await mRE7.connect(owner).pause();
      expect(await mRE7.paused()).eq(true);

      await expect(mRE7.connect(owner).unpause()).to.emit(
        mRE7,
        mRE7.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await mRE7.paused()).eq(false);
    });
  });

  describe('mint()', () => {
    it('should fail: call from address without M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await mint({ mRE7, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mRE7, owner }, to, amount);
    });
  });

  describe('burn()', () => {
    it('should fail: call from address without M_EDGE_BURN_OPERATOR_ROLE role', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await burn({ mRE7, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: call when user has insufficient balance', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await burn({ mRE7, owner }, to, amount, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('call from address with M_EDGE_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mRE7, owner }, to, amount);
      await burn({ mRE7, owner }, to, amount);
    });
  });

  describe('setMetadata()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mRE7, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];
      await setMetadataTest({ mRE7, owner }, 'url', 'some value', {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mRE7 } = await loadFixture(defaultDeploy);
      await setMetadataTest({ mRE7, owner }, 'url', 'some value', undefined);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: mint(...) when address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];

      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );
      await mint({ mRE7, owner }, blacklisted, 1, {
        revertMessage: acErrors.WMAC_HAS_ROLE,
      });
    });

    it('should fail: transfer(...) when from address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mRE7, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );

      await expect(
        mRE7.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transfer(...) when to address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];

      await mint({ mRE7, owner }, from, 1);
      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );

      await expect(
        mRE7.connect(from).transfer(blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when from address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mRE7, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );

      await mRE7.connect(blacklisted).approve(to.address, 1);

      await expect(
        mRE7.connect(to).transferFrom(blacklisted.address, to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when to address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const caller = regularAccounts[2];

      await mint({ mRE7, owner }, from, 1);

      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );
      await mRE7.connect(from).approve(caller.address, 1);

      await expect(
        mRE7.connect(caller).transferFrom(from.address, blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('burn(...) when address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];

      await mint({ mRE7, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );
      await burn({ mRE7, owner }, blacklisted, 1);
    });

    it('transferFrom(...) when caller address is blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const to = regularAccounts[2];

      await mint({ mRE7, owner }, from, 1);
      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );

      await mRE7.connect(from).approve(blacklisted.address, 1);

      await expect(
        mRE7.connect(blacklisted).transferFrom(from.address, to.address, 1),
      ).not.reverted;
    });

    it('transfer(...) when caller address was blacklisted and then un-blacklisted', async () => {
      const { owner, mRE7, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[2];

      await mint({ mRE7, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );

      await expect(
        mRE7.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);

      await unBlackList(
        { blacklistable: mRE7, accessControl, owner },
        blacklisted,
      );

      await expect(mRE7.connect(blacklisted).transfer(to.address, 1)).not
        .reverted;
    });
  });
});

describe('MRe7DepositVault', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MRe7DepositVault__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_RE7_DEPOSIT_VAULT_ADMIN_ROLE(),
      );
    });
  });
});

// TODO: uncomment when get rv info from the team
// describe('MRe7RedemptionVault', function () {
//   describe('deployment', () => {
//     it('vaultRole', async () => {
//       const fixture = await loadFixture(defaultDeploy);

//       const tester = await new MRe7RedemptionVault__factory(
//         fixture.owner,
//       ).deploy();

//       expect(await tester.vaultRole()).eq(
//         await tester.M_RE7_REDEMPTION_VAULT_ADMIN_ROLE(),
//       );
//     });
//   });
// });

describe('MRe7CustomAggregatorFeed', () => {
  it('check admin role', async () => {
    const fixture = await loadFixture(defaultDeploy);

    // eslint-disable-next-line camelcase
    const tester = await new MRe7CustomAggregatorFeed__factory(
      fixture.owner,
    ).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });
});

describe('MRe7DataFeed', () => {
  it('check admin role', async () => {
    const fixture = await loadFixture(defaultDeploy);

    // eslint-disable-next-line camelcase
    const tester = await new MRe7DataFeed__factory(fixture.owner).deploy();

    expect(await tester.feedAdminRole()).eq(
      await tester.M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    );
  });
});
