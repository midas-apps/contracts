import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { blackList, acErrors, unBlackList } from './common/ac.helpers';
import { defaultDeploy } from './common/fixtures';
import { burn, mint, setMetadataTest } from './common/mTBILL.helpers';
import {
  MBtcDepositVault__factory,
  MBtcRedemptionVault__factory,
} from '../typechain-types';
import { depositInstantTest } from './common/deposit-vault.helpers';
import { approveBase18, mintToken } from './common/common.helpers';
import {
  addPaymentTokenTest,
  changeTokenAllowanceTest,
  setMinAmountTest,
} from './common/manageable-vault.helpers';
import { redeemInstantTest } from './common/redemption-vault.helpers';

describe('mBTC', function () {
  it('deployment', async () => {
    const { mBTC } = await loadFixture(defaultDeploy);

    expect(await mBTC.name()).eq('mBTC');
    expect(await mBTC.symbol()).eq('mBTC');

    expect(await mBTC.paused()).eq(false);
  });

  it('initialize', async () => {
    const { mBTC } = await loadFixture(defaultDeploy);

    await expect(mBTC.initialize(ethers.constants.AddressZero)).revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('pause()', () => {
    it('should fail: call from address without M_BTC_PAUSE_OPERATOR_ROLE role', async () => {
      const { mBTC, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await expect(mBTC.connect(caller).pause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mBTC } = await loadFixture(defaultDeploy);

      await mBTC.connect(owner).pause();
      await expect(mBTC.connect(owner).pause()).revertedWith(
        `Pausable: paused`,
      );
    });

    it('call when unpaused', async () => {
      const { owner, mBTC } = await loadFixture(defaultDeploy);
      expect(await mBTC.paused()).eq(false);
      await expect(mBTC.connect(owner).pause()).to.emit(
        mBTC,
        mBTC.interface.events['Paused(address)'].name,
      ).to.not.reverted;
      expect(await mBTC.paused()).eq(true);
    });
  });

  describe('unpause()', () => {
    it('should fail: call from address without M__PAUSE_OPERATOR_ROLE role', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await mBTC.connect(owner).pause();
      await expect(mBTC.connect(caller).unpause()).revertedWith(
        acErrors.WMAC_HASNT_ROLE,
      );
    });

    it('should fail: call when already paused', async () => {
      const { owner, mBTC } = await loadFixture(defaultDeploy);

      await expect(mBTC.connect(owner).unpause()).revertedWith(
        `Pausable: not paused`,
      );
    });

    it('call when paused', async () => {
      const { owner, mBTC } = await loadFixture(defaultDeploy);
      expect(await mBTC.paused()).eq(false);
      await mBTC.connect(owner).pause();
      expect(await mBTC.paused()).eq(true);

      await expect(mBTC.connect(owner).unpause()).to.emit(
        mBTC,
        mBTC.interface.events['Unpaused(address)'].name,
      ).to.not.reverted;

      expect(await mBTC.paused()).eq(false);
    });
  });

  describe('mint()', () => {
    it('should fail: call from address without M_BTC_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await mint({ mBTC, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with M_BTC_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mBTC, owner }, to, amount);
    });
  });

  describe('burn()', () => {
    it('should fail: call from address without M_BTC_BURN_OPERATOR_ROLE role', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];

      await burn({ mBTC, owner }, owner, 0, {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('should fail: call when user has insufficient balance', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await burn({ mBTC, owner }, to, amount, {
        revertMessage: 'ERC20: burn amount exceeds balance',
      });
    });

    it('call from address with M_BTC_MINT_OPERATOR_ROLE role', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);

      const amount = parseUnits('100');
      const to = regularAccounts[0].address;

      await mint({ mBTC, owner }, to, amount);
      await burn({ mBTC, owner }, to, amount);
    });
  });

  describe('setMetadata()', () => {
    it('should fail: call from address without DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mBTC, regularAccounts } = await loadFixture(defaultDeploy);
      const caller = regularAccounts[0];
      await setMetadataTest({ mBTC, owner }, 'url', 'some value', {
        from: caller,
        revertMessage: acErrors.WMAC_HASNT_ROLE,
      });
    });

    it('call from address with DEFAULT_ADMIN_ROLE role', async () => {
      const { owner, mBTC } = await loadFixture(defaultDeploy);
      await setMetadataTest({ mBTC, owner }, 'url', 'some value', undefined);
    });
  });

  describe('_beforeTokenTransfer()', () => {
    it('should fail: mint(...) when address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];

      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );
      await mint({ mBTC, owner }, blacklisted, 1, {
        revertMessage: acErrors.WMAC_HAS_ROLE,
      });
    });

    it('should fail: transfer(...) when from address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mBTC, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );

      await expect(
        mBTC.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transfer(...) when to address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];

      await mint({ mBTC, owner }, from, 1);
      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );

      await expect(
        mBTC.connect(from).transfer(blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when from address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];
      const to = regularAccounts[1];

      await mint({ mBTC, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );

      await mBTC.connect(blacklisted).approve(to.address, 1);

      await expect(
        mBTC.connect(to).transferFrom(blacklisted.address, to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('should fail: transferFrom(...) when to address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const caller = regularAccounts[2];

      await mint({ mBTC, owner }, from, 1);

      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );
      await mBTC.connect(from).approve(caller.address, 1);

      await expect(
        mBTC.connect(caller).transferFrom(from.address, blacklisted.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);
    });

    it('burn(...) when address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );
      const blacklisted = regularAccounts[0];

      await mint({ mBTC, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );
      await burn({ mBTC, owner }, blacklisted, 1);
    });

    it('transferFrom(...) when caller address is blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const from = regularAccounts[1];
      const to = regularAccounts[2];

      await mint({ mBTC, owner }, from, 1);
      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );

      await mBTC.connect(from).approve(blacklisted.address, 1);

      await expect(
        mBTC.connect(blacklisted).transferFrom(from.address, to.address, 1),
      ).not.reverted;
    });

    it('transfer(...) when caller address was blacklisted and then un-blacklisted', async () => {
      const { owner, mBTC, regularAccounts, accessControl } = await loadFixture(
        defaultDeploy,
      );

      const blacklisted = regularAccounts[0];
      const to = regularAccounts[2];

      await mint({ mBTC, owner }, blacklisted, 1);
      await blackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );

      await expect(
        mBTC.connect(blacklisted).transfer(to.address, 1),
      ).revertedWith(acErrors.WMAC_HAS_ROLE);

      await unBlackList(
        { blacklistable: mBTC, accessControl, owner },
        blacklisted,
      );

      await expect(mBTC.connect(blacklisted).transfer(to.address, 1)).not
        .reverted;
    });
  });
});

describe('MBtcDepositVault', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MBtcDepositVault__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_BTC_DEPOSIT_VAULT_ADMIN_ROLE(),
      );
    });
  });

  describe('depositInstant', () => {
    it('mint using 1 WBTC when mBTC/BTC price is 1.', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const {
        otherCoins,
        owner,
        mBtcDepositVault: depositVault,
        WBTCToBtcDataFeed,
      } = fixture;
      await mintToken(otherCoins.wbtc, owner, 1);
      await setMinAmountTest({ vault: depositVault, owner }, 0);
      await approveBase18(owner, otherCoins.wbtc, depositVault, 1);

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        otherCoins.wbtc,
        WBTCToBtcDataFeed.address,
        0,
        true,
      );

      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        otherCoins.wbtc.address,
        parseUnits('1.1'),
      );

      await depositInstantTest(
        {
          depositVault,
          mTBILL: fixture.mBTC,
          mTokenToUsdDataFeed: fixture.mBTCToBtcDataFeed,
          owner: fixture.owner,
        },
        fixture.otherCoins.wbtc,
        1,
      );
    });
  });
});

describe('MBtcRedemptionVault', function () {
  describe('deployment', () => {
    it('vaultRole', async () => {
      const fixture = await loadFixture(defaultDeploy);

      const tester = await new MBtcRedemptionVault__factory(
        fixture.owner,
      ).deploy();

      expect(await tester.vaultRole()).eq(
        await tester.M_BTC_REDEMPTION_VAULT_ADMIN_ROLE(),
      );
    });
  });
  describe.only('redeemInstant', () => {
    it('redeem 1 mBTC to WBTC when mBTC/BTC price is 1', async () => {
      const fixture = await loadFixture(defaultDeploy);
      const {
        otherCoins,
        owner,
        mBtcDepositVault: depositVault,
        WBTCToBtcDataFeed,
        mBTC,
        mBtcRedemptionVault: redemptionVault,
      } = fixture;
      console.log('1')
      await mintToken(mBTC, owner, 1);
      console.log('2')

      await mintToken(otherCoins.wbtc, redemptionVault, 1.1);
      console.log('3')

      await setMinAmountTest({ vault: redemptionVault, owner }, 0);
      console.log('4')

      await approveBase18(owner, mBTC, redemptionVault, 1);
      console.log('5')

      await addPaymentTokenTest(
        { vault: depositVault, owner },
        otherCoins.wbtc,
        WBTCToBtcDataFeed.address,
        0,
        true,
      );

      await changeTokenAllowanceTest(
        { vault: depositVault, owner },
        otherCoins.wbtc.address,
        parseUnits('1'),
      );

      await redeemInstantTest(
        {
          redemptionVault,
          mTBILL: fixture.mBTC,
          mTokenToUsdDataFeed: fixture.mBTCToBtcDataFeed,
          owner: fixture.owner,
        },
        fixture.otherCoins.wbtc,
        1,
      );
    });
  });
});
