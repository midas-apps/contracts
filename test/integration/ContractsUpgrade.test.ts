import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { parseUnits } from 'ethers/lib/utils';

import { hyperEvmUpgradeFixture } from './fixtures/upgrades.fixture';

import { approveBase18 } from '../common/common.helpers';
import {
  depositInstantTest,
  depositRequestTest,
  safeApproveRequestTest,
  safeBulkApproveRequestTest as safeBulkApproveDepositRequestTest,
} from '../common/deposit-vault.helpers';
import { mint } from '../common/mTBILL.helpers';
import {
  redeemInstantTest,
  redeemRequestTest,
  safeApproveRedeemRequestTest,
  safeBulkApproveRequestTest as safeBulkApproveRedeemRequestTest,
} from '../common/redemption-vault.helpers';

describe.skip('ContractsUpgrade - HyperEVM Fork Integration Tests', function () {
  this.timeout(120000);

  it('deposit instant', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      depositVault,
      xbxaut,
      xbxautDataFeed,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await approveBase18(xaut0Whale, xaut0, depositVault, 1);

    await depositInstantTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('deposit instant with custom recipient', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      depositVault,
      xbxaut,
      xbxautDataFeed,
      customRecipient,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await approveBase18(xaut0Whale, xaut0, depositVault, 1);

    await depositInstantTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
        customRecipient,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('deposit request', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      depositVault,
      xbxaut,
      xbxautDataFeed,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await approveBase18(xaut0Whale, xaut0, depositVault, 1);

    await depositRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('deposit request approve', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      depositVault,
      xbxaut,
      xbxautDataFeed,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await approveBase18(xaut0Whale, xaut0, depositVault, 1);

    const { requestId, rate } = await depositRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );

    await safeApproveRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
      },
      requestId!,
      rate!,
    );
  });

  it('deposit request approve bulk', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      depositVault,
      xbxaut,
      xbxautDataFeed,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await approveBase18(xaut0Whale, xaut0, depositVault, 1);

    const { requestId } = await depositRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );

    await safeBulkApproveDepositRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
      },
      [{ id: requestId! }],
    );
  });

  it('deposit instant with custom recipient', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      depositVault,
      xbxaut,
      xbxautDataFeed,
      customRecipient,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await approveBase18(xaut0Whale, xaut0, depositVault, 1);

    await depositRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        depositVault,
        owner: vaultsManager,
        customRecipient,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('redeem instant', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      redemptionVaultSwapper,
      xbxaut,
      xbxautDataFeed,
      tokenManager,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await mint(
      { tokenContract: xbxaut, owner: tokenManager },
      xaut0Whale,
      parseUnits('1'),
    );

    await approveBase18(xaut0Whale, xbxaut, redemptionVaultSwapper, 1);

    await redeemInstantTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('redeem instant with custom recipient', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      redemptionVaultSwapper,
      xbxaut,
      xbxautDataFeed,
      tokenManager,
      customRecipient,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await mint(
      { tokenContract: xbxaut, owner: tokenManager },
      xaut0Whale,
      parseUnits('1'),
    );

    await approveBase18(xaut0Whale, xbxaut, redemptionVaultSwapper, 1);

    await redeemInstantTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
        customRecipient,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('redeem request', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      redemptionVaultSwapper,
      xbxaut,
      xbxautDataFeed,
      tokenManager,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await mint(
      { tokenContract: xbxaut, owner: tokenManager },
      xaut0Whale,
      parseUnits('1'),
    );
    await approveBase18(xaut0Whale, xbxaut, redemptionVaultSwapper, 1);

    await redeemRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('redeem request with custom recipient', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      redemptionVaultSwapper,
      xbxaut,
      xbxautDataFeed,
      tokenManager,
      customRecipient,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await mint(
      { tokenContract: xbxaut, owner: tokenManager },
      xaut0Whale,
      parseUnits('1'),
    );
    await approveBase18(xaut0Whale, xbxaut, redemptionVaultSwapper, 1);

    await redeemRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
        customRecipient,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );
  });

  it('redeem request approve', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      redemptionVaultSwapper,
      xbxaut,
      xbxautDataFeed,
      tokenManager,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await mint(
      { tokenContract: xbxaut, owner: tokenManager },
      xaut0Whale,
      parseUnits('1'),
    );
    await approveBase18(xaut0Whale, xbxaut, redemptionVaultSwapper, 1);

    const { requestId, rate } = await redeemRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );

    await safeApproveRedeemRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
      },
      requestId!,
      rate!,
    );
  });

  it('redeem request approve bulk', async function () {
    const {
      xaut0Whale,
      xaut0,
      vaultsManager,
      redemptionVaultSwapper,
      xbxaut,
      xbxautDataFeed,
      tokenManager,
    } = await loadFixture(hyperEvmUpgradeFixture);

    await mint(
      { tokenContract: xbxaut, owner: tokenManager },
      xaut0Whale,
      parseUnits('1'),
    );
    await approveBase18(xaut0Whale, xbxaut, redemptionVaultSwapper, 1);

    const { requestId, rate } = await redeemRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
      },
      xaut0,
      1,
      { from: xaut0Whale },
    );

    await safeBulkApproveRedeemRequestTest(
      {
        mTBILL: xbxaut,
        mTokenToUsdDataFeed: xbxautDataFeed,
        redemptionVault: redemptionVaultSwapper,
        owner: vaultsManager,
      },
      [{ id: requestId! }],
      rate!,
    );
  });
});
