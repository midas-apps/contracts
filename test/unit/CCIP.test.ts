import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { getRolesForToken } from '../../helpers/roles';
import {
  ERC20Mock__factory,
  IMidasCCTFailedMessageFallback__factory,
  IMidasCCTFallbackEscrow__factory,
  MidasCCTBurnMintTokenPool__factory,
} from '../../typechain-types';
import { blackList, unBlackList } from '../common/ac.helpers';
import {
  MessageStatus,
  claimFailedMessage,
  claimFailedMessageToRemote,
  closeBulk,
  createEscrowFailedMessage,
  encodeDecimals,
  getFailedMessage,
  lockOrBurn,
  onFailedMessage,
  recoverBulk,
  registerOrphanedBulk,
  releaseOrMint,
  setDefaultRecipient,
  setFallbackReceiver,
} from '../common/ccip.helpers';
import { mintToken } from '../common/common.helpers';
import { deployProxyContract } from '../common/deploy.helpers';
import { ccipCctFixture } from '../common/fixtures';

type Fixture = Awaited<ReturnType<typeof ccipCctFixture>>;

const enabledRateLimiter = (capacity: string, rate: string) => ({
  isEnabled: true,
  capacity: parseUnits(capacity),
  rate: parseUnits(rate),
});

type RateLimiterConfig = {
  isEnabled: boolean;
  capacity: BigNumberish;
  rate: BigNumberish;
};

// CCIP 2.0.0 replaced setChainRateLimiterConfig(selector, outbound, inbound)
// with setRateLimitConfig(RateLimitConfigArgs[]). This shim keeps the tests
// expressive while targeting the new API (standard, non-fast-finality).
const setChainRateLimiterConfig = (
  pool: Fixture['pool'],
  remoteChainSelector: BigNumberish,
  outboundRateLimiterConfig: RateLimiterConfig,
  inboundRateLimiterConfig: RateLimiterConfig,
) =>
  pool.setRateLimitConfig([
    {
      remoteChainSelector,
      fastFinality: false,
      outboundRateLimiterConfig,
      inboundRateLimiterConfig,
    },
  ]);

describe.only('CCIP', function () {
  describe('MidasCCTBurnMintTokenPool', () => {
    describe('deployment', () => {
      it('should fail: when token decimals are not 18', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { owner, pool, rmn, router, fallbackReceiver } = fixture;

        const token = await new ERC20Mock__factory(owner).deploy(6);

        await expect(
          new MidasCCTBurnMintTokenPool__factory(owner).deploy(
            token.address,
            rmn.address,
            router.address,
            fallbackReceiver.address,
          ),
        )
          .revertedWithCustomError(pool, 'InvalidDecimalArgs')
          .withArgs(18, 6);
      });

      it('should fail: when router is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { owner, pool, rmn, mTBILL, fallbackReceiver } = fixture;

        await expect(
          new MidasCCTBurnMintTokenPool__factory(owner).deploy(
            mTBILL.address,
            rmn.address,
            constants.AddressZero,
            fallbackReceiver.address,
          ),
        ).revertedWithCustomError(pool, 'ZeroAddressInvalid');
      });

      it('should fail: when rmn is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { owner, pool, router, mTBILL, fallbackReceiver } = fixture;

        await expect(
          new MidasCCTBurnMintTokenPool__factory(owner).deploy(
            mTBILL.address,
            constants.AddressZero,
            router.address,
            fallbackReceiver.address,
          ),
        ).revertedWithCustomError(pool, 'ZeroAddressInvalid');
      });

      it('should fail: when fallback receiver is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { owner, pool, rmn, router, mTBILL } = fixture;

        await expect(
          new MidasCCTBurnMintTokenPool__factory(owner).deploy(
            mTBILL.address,
            rmn.address,
            router.address,
            constants.AddressZero,
          ),
        )
          .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
          .withArgs(constants.AddressZero);
      });

      it('sets the fallback receiver from the constructor', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, fallbackReceiver } = fixture;

        expect(await pool.fallbackReceiver()).eq(fallbackReceiver.address);
      });

      it('encodes 18 decimals in the destPoolData and sourcePoolData', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        expect(await fixture.pool.getTokenDecimals()).eq(18);
        expect(encodeDecimals(18)).eq(
          ethers.utils.defaultAbiCoder.encode(['uint256'], [18]),
        );
      });
    });

    describe('setFallbackReceiver', () => {
      it('updates the fallback receiver when called by the owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        await setFallbackReceiver(fixture, alice);
      });

      it('should fail: when called by a non-owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice } = fixture;

        await setFallbackReceiver(fixture, alice, {
          from: alice,
          revertWithCustomError: {
            contract: pool,
            error: 'OnlyCallableByOwner',
          },
        });
      });

      it('should fail: when the new fallback receiver is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool } = fixture;

        await setFallbackReceiver(fixture, constants.AddressZero, {
          revertWithCustomError: {
            contract: pool,
            error: 'InvalidFallbackReceiver',
            args: [constants.AddressZero],
          },
        });
      });
    });

    describe('lockOrBurn', () => {
      it('burns the pool balance when called by the onRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);

        await lockOrBurn(fixture, { amount: parseUnits('100') });
      });

      it('should fail: when the pool loses the burner role', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, accessControl } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);

        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.burner, pool.address);

        await lockOrBurn(
          fixture,
          { amount: parseUnits('100') },
          { revertMessage: 'WMAC: hasnt role' },
        );
      });

      it('should fail: when called by the owner instead of the onRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, owner } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);

        await lockOrBurn(
          fixture,
          { amount: parseUnits('100') },
          {
            from: owner,
            revertWithCustomError: {
              contract: pool,
              error: 'CallerIsNotARampOnRouter',
              args: [owner.address],
            },
          },
        );
      });

      it('should fail: when called by a random address instead of the onRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice } = fixture;

        await lockOrBurn(
          fixture,
          { amount: parseUnits('100') },
          {
            from: alice,
            revertWithCustomError: {
              contract: pool,
              error: 'CallerIsNotARampOnRouter',
              args: [alice.address],
            },
          },
        );
      });

      it('should fail: when the local token is not the pool token', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, remoteToken } = fixture;

        await lockOrBurn(
          fixture,
          { amount: parseUnits('100'), localToken: remoteToken.address },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'InvalidToken',
              args: [remoteToken.address],
            },
          },
        );
      });

      it('should fail: when the remote chain is not configured', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool } = fixture;

        const unknownChainSelector = ethers.BigNumber.from('999');

        await lockOrBurn(
          fixture,
          {
            amount: parseUnits('100'),
            remoteChainSelector: unknownChainSelector,
          },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'ChainNotAllowed',
              args: [unknownChainSelector],
            },
          },
        );
      });

      it('should fail: when RMN is cursed', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, rmn } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);
        await rmn.setCursed(true);

        await lockOrBurn(
          fixture,
          { amount: parseUnits('100') },
          { revertWithCustomError: { contract: pool, error: 'CursedByRMN' } },
        );
      });

      it('succeeds after RMN curse is lifted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, rmn } = fixture;

        await mintToken(fixture.mTBILL, pool.address, 100);
        await rmn.setCursed(true);
        await rmn.setCursed(false);

        await lockOrBurn(fixture, { amount: parseUnits('100') });
      });

      it('burns even when the original sender is blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, accessControl, owner } = fixture;

        await mintToken(mTBILL, pool.address, 100);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, owner);

        await lockOrBurn(fixture, { amount: parseUnits('100') });
      });

      it('handles a zero-amount burn', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        await lockOrBurn(fixture, { amount: 0 });
      });
    });

    describe('releaseOrMint', () => {
      it('mints to the receiver when called by the offRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: fixture.alice.address,
        });
      });

      it('should fail: when the pool loses the minter role', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, accessControl } = fixture;

        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.minter, pool.address);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          expectFallbackFail: true,
          expectMinted: false,
        });
      });

      it('should fail: when called by the owner instead of the offRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, owner } = fixture;

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100') },
          {
            from: owner,
            revertWithCustomError: {
              contract: pool,
              error: 'CallerIsNotARampOnRouter',
              args: [owner.address],
            },
          },
        );
      });

      it('should fail: when called by a random address instead of the offRamp', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice } = fixture;

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100') },
          {
            from: alice,
            revertWithCustomError: {
              contract: pool,
              error: 'CallerIsNotARampOnRouter',
              args: [alice.address],
            },
          },
        );
      });

      it('should fail: when the local token is not the pool token', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, remoteToken } = fixture;

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100'), localToken: remoteToken.address },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'InvalidToken',
              args: [remoteToken.address],
            },
          },
        );
      });

      it('should fail: when the remote chain is not configured', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool } = fixture;

        const unknownChainSelector = ethers.BigNumber.from('999');

        await releaseOrMint(
          fixture,
          {
            amount: parseUnits('100'),
            remoteChainSelector: unknownChainSelector,
          },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'ChainNotAllowed',
              args: [unknownChainSelector],
            },
          },
        );
      });

      it('should fail: when the source pool address is not registered', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice } = fixture;

        const unknownSourcePool = ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [alice.address],
        );

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100'), sourcePoolAddress: unknownSourcePool },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'InvalidSourcePoolAddress',
              args: [unknownSourcePool],
            },
          },
        );
      });

      it('should fail: when RMN is cursed', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, rmn } = fixture;

        await rmn.setCursed(true);

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100') },
          { revertWithCustomError: { contract: pool, error: 'CursedByRMN' } },
        );
      });

      it('succeeds after RMN curse is lifted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, rmn } = fixture;

        await rmn.setCursed(true);
        await rmn.setCursed(false);

        await releaseOrMint(fixture, { amount: parseUnits('100') });
      });

      it('mints to the escrow and records the failed message when the receiver is blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, escrow } = fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallback: true,
          expectFallbackCallback: true,
          expectEscrowRecord: true,
        });

        expect(await mTBILL.balanceOf(escrow.address)).eq(parseUnits('100'));
      });

      it('mints to an EOA fallback without recording an escrow message', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        await setFallbackReceiver(fixture, defaultRecipient);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallback: true,
          expectFallbackCallback: false,
          expectEscrowRecord: false,
        });
      });

      it('emits FallbackFail when the receiver and fallback receiver are both blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, fallbackReceiver } =
          fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        await blackList(
          { blacklistable: mTBILL, accessControl, owner },
          fallbackReceiver.address,
        );

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallbackFail: true,
          expectMinted: false,
        });
      });

      it('handles a zero-amount mint', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        await releaseOrMint(fixture, { amount: 0, receiver: alice.address });
      });

      it('rolls back the fallback mint when the callback reverts', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice } = fixture;

        const reverting = await (
          await ethers.getContractFactory(
            'MidasCCTFailedMessageFallbackRevertingTester',
          )
        ).deploy();
        await setFallbackReceiver(fixture, reverting.address);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        // releaseOrMint asserts totalSupply and the fallback balance are
        // unchanged, proving the fallback mint is reverted together with the
        // failing callback.
        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallbackFail: true,
          expectMinted: false,
        });

        expect(await mTBILL.balanceOf(reverting.address)).eq(0);
      });

      it('emits FallbackFail when the fallback escrow is wired to a different pool', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { accessControl, defaultRecipient, owner, alice, mTBILL } =
          fixture;

        // An escrow whose tokenPool is NOT this pool, so its onFailedMessage
        // guard rejects the callback and the fallback mint is rolled back.
        const foreignEscrow = await deployProxyContract<Fixture['escrow']>(
          'MidasCCTFallbackEscrow',
          [accessControl.address, alice.address, defaultRecipient.address],
        );
        await setFallbackReceiver(fixture, foreignEscrow.address);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallbackFail: true,
          expectMinted: false,
        });

        expect(await mTBILL.balanceOf(foreignEscrow.address)).eq(0);
        expect(await foreignEscrow.failedMessageCount()).eq(0);
      });
    });

    describe('handleFallback', () => {
      it('should fail: when called by an address other than the pool itself', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, owner, alice, remoteChainSelector } = fixture;

        await expect(
          pool
            .connect(owner)
            .handleFallback(
              alice.address,
              parseUnits('1'),
              remoteChainSelector,
            ),
        ).revertedWithCustomError(pool, 'NotSelf');
      });
    });

    describe('outbound rate limiting', () => {
      it('should fail: when a single burn exceeds the capacity', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, remoteChainSelector } = fixture;

        await mintToken(mTBILL, pool.address, 1000);
        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          enabledRateLimiter('100', '10'),
          { isEnabled: false, capacity: 0, rate: 0 },
        );
        await time.increase(3600);

        await lockOrBurn(
          fixture,
          { amount: parseUnits('101') },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'TokenMaxCapacityExceeded',
              args: [parseUnits('100'), parseUnits('101'), mTBILL.address],
            },
          },
        );
      });

      it('should fail: when the bucket is drained by a prior burn', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, remoteChainSelector } = fixture;

        await mintToken(mTBILL, pool.address, 1000);
        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          enabledRateLimiter('100', '10'),
          { isEnabled: false, capacity: 0, rate: 0 },
        );
        await time.increase(3600);

        await lockOrBurn(fixture, { amount: parseUnits('100') });

        await expect(
          pool
            .connect(fixture.onRamp)
            ['lockOrBurn((bytes,uint64,address,uint256,address))']({
              receiver: '0x',
              remoteChainSelector,
              originalSender: fixture.owner.address,
              amount: parseUnits('100'),
              localToken: mTBILL.address,
            }),
        ).revertedWithCustomError(pool, 'TokenRateLimitReached');
      });

      it('succeeds again after the bucket refills', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, remoteChainSelector } = fixture;

        await mintToken(mTBILL, pool.address, 1000);
        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          enabledRateLimiter('100', '10'),
          { isEnabled: false, capacity: 0, rate: 0 },
        );
        await time.increase(3600);

        await lockOrBurn(fixture, { amount: parseUnits('100') });
        await time.increase(3600);
        await lockOrBurn(fixture, { amount: parseUnits('100') });
      });

      it('should fail: rate limiter with zero capacity blocks any amount', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, remoteChainSelector } = fixture;

        await mintToken(mTBILL, pool.address, 1000);
        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          { isEnabled: true, capacity: 0, rate: 0 },
          { isEnabled: false, capacity: 0, rate: 0 },
        );

        await lockOrBurn(
          fixture,
          { amount: parseUnits('1') },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'TokenMaxCapacityExceeded',
              args: [0, parseUnits('1'), mTBILL.address],
            },
          },
        );
      });
    });

    describe('inbound rate limiting', () => {
      it('should fail: when a single mint exceeds the capacity', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, remoteChainSelector } = fixture;

        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          { isEnabled: false, capacity: 0, rate: 0 },
          enabledRateLimiter('100', '10'),
        );

        await releaseOrMint(
          fixture,
          { amount: parseUnits('101') },
          {
            revertWithCustomError: {
              contract: pool,
              error: 'TokenMaxCapacityExceeded',
              args: [parseUnits('100'), parseUnits('101'), mTBILL.address],
            },
          },
        );
      });

      it('should fail: when the bucket is drained by a prior mint', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, mTBILL, remoteChainSelector, remotePoolAddress } =
          fixture;

        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          { isEnabled: false, capacity: 0, rate: 0 },
          enabledRateLimiter('100', '10'),
        );
        await time.increase(3600);

        await releaseOrMint(fixture, { amount: parseUnits('100') });

        await expect(
          pool
            .connect(fixture.offRamp)
            [
              'releaseOrMint((bytes,uint64,address,uint256,address,bytes,bytes,bytes))'
            ]({
              originalSender: fixture.owner.address,
              remoteChainSelector,
              receiver: fixture.owner.address,
              sourceDenominatedAmount: parseUnits('100'),
              localToken: mTBILL.address,
              sourcePoolAddress: remotePoolAddress,
              sourcePoolData: encodeDecimals(18),
              offchainTokenData: '0x',
            }),
        ).revertedWithCustomError(pool, 'TokenRateLimitReached');
      });

      it('succeeds again after the bucket refills', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, remoteChainSelector } = fixture;

        await setChainRateLimiterConfig(
          pool,
          remoteChainSelector,
          { isEnabled: false, capacity: 0, rate: 0 },
          enabledRateLimiter('100', '10'),
        );
        await time.increase(3600);

        await releaseOrMint(fixture, { amount: parseUnits('100') });
        await time.increase(3600);
        await releaseOrMint(fixture, { amount: parseUnits('100') });
      });
    });

    describe('allowlist', () => {
      // In CCIP 2.0.0 the pool-level allowlist was removed. Sender allowlisting
      // is now an optional, separately-deployed AdvancedPoolHooks contract.
      // The Midas pool is deployed with no hooks (advancedPoolHooks = address(0)),
      // so it is permissionless and accepts any originalSender.
      it('is permissionless by default and accepts any sender', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice } = fixture;

        expect(await pool.getAdvancedPoolHooks()).eq(constants.AddressZero);

        await mintToken(fixture.mTBILL, pool.address, 100);
        await lockOrBurn(fixture, {
          amount: parseUnits('100'),
          originalSender: alice.address,
        });
      });
    });

    describe('admin', () => {
      it('exposes the configured chains and remote pools', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, remoteChainSelector, remotePoolAddress } = fixture;

        expect(await pool.getSupportedChains()).deep.eq([remoteChainSelector]);
        expect(await pool.isSupportedChain(remoteChainSelector)).eq(true);
        expect(await pool.getRemotePools(remoteChainSelector)).deep.eq([
          remotePoolAddress,
        ]);
        expect(
          await pool.isRemotePool(remoteChainSelector, remotePoolAddress),
        ).eq(true);
      });

      it('transfers ownership through the 2-step flow', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, owner, alice } = fixture;

        await pool.connect(owner).transferOwnership(alice.address);
        expect(await pool.owner()).eq(owner.address);

        await pool.connect(alice).acceptOwnership();
        expect(await pool.owner()).eq(alice.address);
      });

      it('should fail: acceptOwnership by a non-pending owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, owner, alice } = fixture;

        await pool.connect(owner).transferOwnership(alice.address);

        await expect(
          pool.connect(owner).acceptOwnership(),
        ).revertedWithCustomError(pool, 'MustBeProposedOwner');
      });

      it('should fail: applyChainUpdates by a non-owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice } = fixture;

        await expect(
          pool.connect(alice).applyChainUpdates([], []),
        ).revertedWithCustomError(pool, 'OnlyCallableByOwner');
      });

      it('should fail: setChainRateLimiterConfig by a non-owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice, remoteChainSelector } = fixture;

        await expect(
          pool.connect(alice).setRateLimitConfig([
            {
              remoteChainSelector,
              fastFinality: false,
              outboundRateLimiterConfig: {
                isEnabled: false,
                capacity: 0,
                rate: 0,
              },
              inboundRateLimiterConfig: {
                isEnabled: false,
                capacity: 0,
                rate: 0,
              },
            },
          ]),
        ).revertedWithCustomError(pool, 'Unauthorized');
      });

      it('should fail: addRemotePool by a non-owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice, remoteChainSelector, remotePoolAddress } = fixture;

        await expect(
          pool
            .connect(alice)
            .addRemotePool(remoteChainSelector, remotePoolAddress),
        ).revertedWithCustomError(pool, 'OnlyCallableByOwner');
      });

      it('should fail: setDynamicConfig by a non-owner', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, alice, router } = fixture;

        await expect(
          pool
            .connect(alice)
            .setDynamicConfig(
              router.address,
              constants.AddressZero,
              constants.AddressZero,
            ),
        ).revertedWithCustomError(pool, 'OnlyCallableByOwner');
      });
    });
  });

  describe('MidasCCTFallbackEscrow', () => {
    describe('deployment', () => {
      it('initializes tokenPool, defaultRecipient and accessControl', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, pool, accessControl, defaultRecipient } = fixture;

        expect(await escrow.tokenPool()).eq(pool.address);
        expect(await escrow.defaultRecipient()).eq(defaultRecipient.address);
        expect(await escrow.accessControl()).eq(accessControl.address);
        expect(await escrow.failedMessageCount()).eq(0);
        expect(await escrow.getFailedMessageIds()).deep.eq([]);
      });

      it('should fail: when accessControl is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, defaultRecipient } = fixture;

        await expect(
          deployProxyContract('MidasCCTFallbackEscrow', [
            constants.AddressZero,
            pool.address,
            defaultRecipient.address,
          ]),
        ).revertedWith('zero address');
      });

      it('should fail: when tokenPool is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, accessControl, defaultRecipient } = fixture;

        await expect(
          deployProxyContract('MidasCCTFallbackEscrow', [
            accessControl.address,
            constants.AddressZero,
            defaultRecipient.address,
          ]),
        ).revertedWithCustomError(escrow, 'ZeroAddress');
      });

      it('should fail: when defaultRecipient is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, accessControl, pool } = fixture;

        await expect(
          deployProxyContract('MidasCCTFallbackEscrow', [
            accessControl.address,
            pool.address,
            constants.AddressZero,
          ]),
        ).revertedWithCustomError(escrow, 'ZeroAddress');
      });

      it('should fail: when initialize is called twice', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, accessControl, pool, defaultRecipient } = fixture;

        await expect(
          escrow.initialize(
            accessControl.address,
            pool.address,
            defaultRecipient.address,
          ),
        ).revertedWith('Initializable: contract is already initialized');
      });
    });

    describe('setDefaultRecipient', () => {
      it('updates the default recipient when called by the admin', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        await setDefaultRecipient(fixture, alice);
      });

      it('should fail: when called by a non-admin', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        await setDefaultRecipient(fixture, alice, {
          from: alice,
          revertWithCustomError: {
            contract: escrow,
            error: 'NotContractAdmin',
          },
        });
      });

      it('should fail: when the new default recipient is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow } = fixture;

        await setDefaultRecipient(fixture, constants.AddressZero, {
          revertWithCustomError: {
            contract: escrow,
            error: 'ZeroAddress',
          },
        });
      });
    });

    describe('onFailedMessage', () => {
      it('records a failed message when called by the token pool', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });
      });

      it('should fail: when called by an address other than the token pool', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        await onFailedMessage(
          fixture,
          {
            originalRecipient: alice,
            tokenAmount: parseUnits('100'),
          },
          {
            from: alice,
            revertWithCustomError: {
              contract: escrow,
              error: 'NotTokenPool',
            },
          },
        );
      });
    });

    describe('claimToRemote', () => {
      const encodeRemoteRecipient = (recipient: string) =>
        ethers.utils.defaultAbiCoder.encode(['address'], [recipient]);

      const wireMockRouter = async (fixture: Fixture) => {
        const { pool, owner } = fixture;
        const mockRouter = await (
          await ethers.getContractFactory('CCIPRouterClientMock')
        ).deploy();
        await pool
          .connect(owner)
          .setDynamicConfig(
            mockRouter.address,
            constants.AddressZero,
            constants.AddressZero,
          );
        return mockRouter;
      };

      it('lets the original recipient claim escrowed tokens to a remote chain', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          mTBILL,
          accessControl,
          owner,
          alice,
          defaultRecipient,
          remoteChainSelector,
        } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        const mockRouter = await wireMockRouter(fixture);
        const expectedCcipMessageId = ethers.utils.formatBytes32String('ccip');
        await mockRouter.setNextMessageId(expectedCcipMessageId);

        const remoteRecipient = encodeRemoteRecipient(defaultRecipient.address);
        const escrowBalanceBefore = await mTBILL.balanceOf(
          fixture.escrow.address,
        );
        const routerBalanceBefore = await mTBILL.balanceOf(mockRouter.address);

        await expect(
          fixture.escrow
            .connect(alice)
            .claimToRemote(messageId, remoteRecipient, remoteChainSelector),
        )
          .to.emit(fixture.escrow, 'ClaimToRemote')
          .withArgs(
            messageId,
            expectedCcipMessageId,
            remoteRecipient,
            remoteChainSelector,
          )
          .and.to.emit(mockRouter, 'CcipSend')
          .withArgs(
            remoteChainSelector,
            constants.AddressZero,
            0,
            mTBILL.address,
            parseUnits('100'),
            remoteRecipient,
          );

        expect(await mTBILL.balanceOf(fixture.escrow.address)).eq(
          escrowBalanceBefore.sub(parseUnits('100')),
        );
        expect(await mTBILL.balanceOf(mockRouter.address)).eq(
          routerBalanceBefore.add(parseUnits('100')),
        );
        expect((await getFailedMessage(fixture.escrow, messageId)).status).eq(
          MessageStatus.Claimed,
        );
        expect(await fixture.escrow.getFailedMessageIds()).deep.eq([]);
      });

      it('pays the native fee required by the router', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('50'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        const mockRouter = await wireMockRouter(fixture);
        const fee = parseUnits('0.01', 18);
        await mockRouter.setFee(fee);

        await claimFailedMessageToRemote(
          fixture,
          {
            messageId,
            recipient: encodeRemoteRecipient(defaultRecipient.address),
            value: fee,
          },
          { from: alice },
        );

        expect(await ethers.provider.getBalance(mockRouter.address)).eq(fee);
      });

      it('should fail: when the attached native fee is insufficient', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('50'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        const mockRouter = await wireMockRouter(fixture);
        await mockRouter.setFee(parseUnits('0.01', 18));

        await expect(
          fixture.escrow
            .connect(alice)
            .claimToRemote(
              messageId,
              encodeRemoteRecipient(defaultRecipient.address),
              fixture.remoteChainSelector,
              { value: 0 },
            ),
        ).revertedWithCustomError(mockRouter, 'InsufficientFeeTokenAmount');
      });

      it('should fail: when the caller is not the original recipient', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          escrow,
          mTBILL,
          accessControl,
          owner,
          alice,
          defaultRecipient,
        } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );
        await wireMockRouter(fixture);

        await claimFailedMessageToRemote(
          fixture,
          {
            messageId,
            recipient: encodeRemoteRecipient(defaultRecipient.address),
          },
          {
            from: defaultRecipient,
            revertWithCustomError: {
              contract: escrow,
              error: 'InvalidSender',
              args: [alice.address],
            },
          },
        );
      });

      it('should fail: when the caller is blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice, defaultRecipient } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });
        await wireMockRouter(fixture);

        await claimFailedMessageToRemote(
          fixture,
          {
            messageId,
            recipient: encodeRemoteRecipient(defaultRecipient.address),
          },
          {
            from: alice,
            revertMessage: 'WMAC: has role',
          },
        );
      });

      it('should fail: when the message is not found', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice, defaultRecipient } = fixture;
        const unknownMessageId = ethers.utils.formatBytes32String('unknown');
        await wireMockRouter(fixture);

        await claimFailedMessageToRemote(
          fixture,
          {
            messageId: unknownMessageId,
            recipient: encodeRemoteRecipient(defaultRecipient.address),
          },
          {
            from: alice,
            revertWithCustomError: {
              contract: escrow,
              error: 'FailedMessageNotFound',
              args: [unknownMessageId],
            },
          },
        );
      });

      it('should fail: when the message was already claimed locally', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          escrow,
          mTBILL,
          accessControl,
          owner,
          alice,
          defaultRecipient,
        } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: alice,
          },
          { from: alice },
        );

        await wireMockRouter(fixture);

        await claimFailedMessageToRemote(
          fixture,
          {
            messageId,
            recipient: encodeRemoteRecipient(defaultRecipient.address),
          },
          {
            from: alice,
            revertWithCustomError: {
              contract: escrow,
              error: 'FailedMessageNotFound',
              args: [messageId],
            },
          },
        );
      });

      it('forwards the entire attached value to the router, losing any excess', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('50'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        const mockRouter = await wireMockRouter(fixture);
        const fee = parseUnits('0.01', 18);
        await mockRouter.setFee(fee);
        const overpaid = fee.mul(2);

        await claimFailedMessageToRemote(
          fixture,
          {
            messageId,
            recipient: encodeRemoteRecipient(defaultRecipient.address),
            value: overpaid,
          },
          { from: alice },
        );

        expect(await ethers.provider.getBalance(mockRouter.address)).eq(
          overpaid,
        );
      });
    });

    describe('claim', () => {
      it('lets the original recipient claim to themselves after unblacklist', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: alice,
          },
          { from: alice },
        );
      });

      it('lets the original recipient claim to another address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('50'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: defaultRecipient,
          },
          { from: alice },
        );
      });

      it('should fail: when the caller is not the original recipient', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          escrow,
          mTBILL,
          accessControl,
          owner,
          alice,
          defaultRecipient,
        } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: defaultRecipient,
          },
          {
            from: defaultRecipient,
            revertWithCustomError: {
              contract: escrow,
              error: 'InvalidSender',
              args: [alice.address],
            },
          },
        );
      });

      it('should fail: when the caller is blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: alice,
          },
          {
            from: alice,
            revertMessage: 'WMAC: has role',
          },
        );
      });

      it('should fail: when the message is not found', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;
        const unknownMessageId = ethers.utils.formatBytes32String('unknown');

        await claimFailedMessage(
          fixture,
          {
            messageId: unknownMessageId,
            recipient: alice,
          },
          {
            from: alice,
            revertWithCustomError: {
              contract: escrow,
              error: 'FailedMessageNotFound',
              args: [unknownMessageId],
            },
          },
        );
      });

      it('should fail: when the message was already claimed', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, mTBILL, accessControl, owner, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: alice,
          },
          { from: alice },
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: alice,
          },
          {
            from: alice,
            revertWithCustomError: {
              contract: escrow,
              error: 'FailedMessageNotFound',
              args: [messageId],
            },
          },
        );
      });

      it('redirects to the original recipient when the recipient is the zero address', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, mTBILL, accessControl, owner, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        const aliceBalanceBefore = await mTBILL.balanceOf(alice.address);

        await expect(
          escrow.connect(alice).claim(messageId, constants.AddressZero),
        )
          .to.emit(escrow, 'Claim')
          .withArgs(messageId, constants.AddressZero);

        expect(await mTBILL.balanceOf(alice.address)).eq(
          aliceBalanceBefore.add(parseUnits('100')),
        );
      });

      it('should fail: when the claim recipient is blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );
        await blackList(
          { blacklistable: mTBILL, accessControl, owner },
          defaultRecipient,
        );

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: defaultRecipient,
          },
          { from: alice, revertMessage: 'WMAC: has role' },
        );
      });

      it('should fail: when the escrow was never funded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        const [messageId] = await registerOrphanedBulk(fixture, [
          { originalRecipient: alice.address, tokenAmount: parseUnits('100') },
        ]);

        await claimFailedMessage(
          fixture,
          {
            messageId,
            recipient: alice,
          },
          {
            from: alice,
            revertMessage: 'ERC20: transfer amount exceeds balance',
          },
        );
      });
    });

    describe('recoverBulk', () => {
      it('should fail: when the escrow was never funded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        const [messageId] = await registerOrphanedBulk(fixture, [
          { originalRecipient: alice.address, tokenAmount: parseUnits('100') },
        ]);

        await recoverBulk(fixture, [messageId], {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        });
      });

      it('should fail: when a message id is duplicated in one call', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, mTBILL, accessControl, owner, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        await recoverBulk(fixture, [messageId, messageId], {
          revertWithCustomError: {
            contract: escrow,
            error: 'FailedMessageNotFound',
            args: [messageId],
          },
        });
      });

      it('should fail: reverts the whole batch when one id is unknown', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, mTBILL, accessControl, owner, alice } = fixture;
        const unknownMessageId = ethers.utils.formatBytes32String('unknown');

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );

        const escrowBalanceBefore = await mTBILL.balanceOf(escrow.address);

        await recoverBulk(fixture, [messageId, unknownMessageId], {
          revertWithCustomError: {
            contract: escrow,
            error: 'FailedMessageNotFound',
            args: [unknownMessageId],
          },
        });

        // the valid message must not be partially resolved
        expect(await mTBILL.balanceOf(escrow.address)).eq(escrowBalanceBefore);
        expect(await escrow.getFailedMessageIds()).deep.eq([messageId]);
        expect((await getFailedMessage(escrow, messageId)).status).eq(
          MessageStatus.Pending,
        );
      });

      it('no-ops on an empty list', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        await recoverBulk(fixture, []);
      });

      it('recovers failed messages to the original recipients', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, defaultRecipient } =
          fixture;

        const messageIdAlice = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });
        const messageIdDefault = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('25'),
          receiver: defaultRecipient,
        });

        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          alice,
        );
        await unBlackList(
          { blacklistable: mTBILL, accessControl, owner },
          defaultRecipient,
        );

        await recoverBulk(fixture, [messageIdAlice, messageIdDefault]);
      });

      it('should fail: when called by a non-admin', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await recoverBulk(fixture, [messageId], {
          from: alice,
          revertWithCustomError: {
            contract: escrow,
            error: 'NotContractAdmin',
          },
        });
      });

      it('should fail: when a message is not found', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow } = fixture;
        const unknownMessageId = ethers.utils.formatBytes32String('unknown');

        await recoverBulk(fixture, [unknownMessageId], {
          revertWithCustomError: {
            contract: escrow,
            error: 'FailedMessageNotFound',
            args: [unknownMessageId],
          },
        });
      });

      it('should fail: when the original recipient is still blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await recoverBulk(fixture, [messageId], {
          revertMessage: 'WMAC: has role',
        });
      });
    });

    describe('closeBulk', () => {
      it('should fail: when the escrow was never funded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        const [messageId] = await registerOrphanedBulk(fixture, [
          { originalRecipient: alice.address, tokenAmount: parseUnits('100') },
        ]);

        await closeBulk(fixture, [messageId], {
          revertMessage: 'ERC20: transfer amount exceeds balance',
        });
      });

      it('should fail: when a message id is duplicated in one call', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await closeBulk(fixture, [messageId, messageId], {
          revertWithCustomError: {
            contract: escrow,
            error: 'FailedMessageNotFound',
            args: [messageId],
          },
        });
      });

      it('no-ops on an empty list', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        await closeBulk(fixture, []);
      });

      it('closes failed messages and transfers tokens to the default recipient', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await closeBulk(fixture, [messageId]);
      });

      it('closes multiple failed messages in one call', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice, customRecipient } = fixture;

        const messageIdAlice = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('40'),
          receiver: alice,
        });
        const messageIdCustom = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('60'),
          receiver: customRecipient,
        });

        await closeBulk(fixture, [messageIdAlice, messageIdCustom]);
      });

      it('should fail: when called by a non-admin', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await closeBulk(fixture, [messageId], {
          from: alice,
          revertWithCustomError: {
            contract: escrow,
            error: 'NotContractAdmin',
          },
        });
      });

      it('should fail: when a message is not found', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow } = fixture;
        const unknownMessageId = ethers.utils.formatBytes32String('unknown');

        await closeBulk(fixture, [unknownMessageId], {
          revertWithCustomError: {
            contract: escrow,
            error: 'FailedMessageNotFound',
            args: [unknownMessageId],
          },
        });
      });

      it('uses the updated default recipient after setDefaultRecipient', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, alice, owner } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        await setDefaultRecipient(fixture, owner);

        const ownerBalanceBefore = await mTBILL.balanceOf(owner.address);
        await closeBulk(fixture, [messageId]);
        expect(await mTBILL.balanceOf(owner.address)).eq(
          ownerBalanceBefore.add(parseUnits('100')),
        );
      });
    });

    describe('registerOrphanedBulk', () => {
      it('stores two identical messages under distinct ids', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        const messageIds = await registerOrphanedBulk(fixture, [
          { originalRecipient: alice.address, tokenAmount: parseUnits('100') },
          { originalRecipient: alice.address, tokenAmount: parseUnits('100') },
        ]);

        expect(messageIds[0]).to.not.eq(messageIds[1]);
        expect(await escrow.getFailedMessageIds()).deep.eq(messageIds);
      });

      it('no-ops on an empty list', async () => {
        const fixture = await loadFixture(ccipCctFixture);

        const messageIds = await registerOrphanedBulk(fixture, []);

        expect(messageIds).to.have.length(0);
      });

      it('registers orphaned messages without transferring tokens', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { alice, customRecipient } = fixture;

        const messageIds = await registerOrphanedBulk(fixture, [
          {
            originalRecipient: alice.address,
            tokenAmount: parseUnits('100'),
          },
          {
            originalRecipient: customRecipient.address,
            tokenAmount: parseUnits('25'),
          },
        ]);

        expect(messageIds).to.have.length(2);
      });

      it('should fail: when called by a non-admin', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        await registerOrphanedBulk(
          fixture,
          [
            {
              originalRecipient: alice.address,
              tokenAmount: parseUnits('100'),
            },
          ],
          {
            from: alice,
            revertWithCustomError: {
              contract: escrow,
              error: 'NotContractAdmin',
            },
          },
        );
      });

      it('lets admin register orphaned tokens after a fallback failure and close them', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, escrow, pool } = fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        await mintToken(mTBILL, escrow.address, 100);

        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.minter, pool.address);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallbackFail: true,
          expectMinted: false,
        });

        const [messageId] = await registerOrphanedBulk(fixture, [
          {
            originalRecipient: alice.address,
            tokenAmount: parseUnits('100'),
          },
        ]);

        await closeBulk(fixture, [messageId]);
      });
    });

    describe('getFailedMessageIds', () => {
      it('returns an empty list when there are no pending messages', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow } = fixture;

        expect(await escrow.getFailedMessageIds()).deep.eq([]);
      });

      it('returns pending message ids and drops them after resolution', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        expect(await escrow.getFailedMessageIds()).deep.eq([messageId]);

        await closeBulk(fixture, [messageId]);

        expect(await escrow.getFailedMessageIds()).deep.eq([]);
      });
    });

    describe('failedMessages', () => {
      it('returns the stored failed message content', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow, alice, remoteChainSelector } = fixture;

        const messageId = await createEscrowFailedMessage(fixture, {
          amount: parseUnits('100'),
          receiver: alice,
        });

        const failedMessage = await getFailedMessage(escrow, messageId);
        expect(failedMessage.originalRecipient).eq(alice.address);
        expect(failedMessage.originalSourceChainSelector).eq(
          remoteChainSelector,
        );
        expect(failedMessage.tokenAmount).eq(parseUnits('100'));
        expect(failedMessage.status).eq(MessageStatus.Pending);
      });

      it('returns empty data for an unknown message id', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow } = fixture;
        const unknownMessageId = ethers.utils.formatBytes32String('unknown');

        const failedMessage = await getFailedMessage(escrow, unknownMessageId);
        expect(failedMessage.originalRecipient).eq(constants.AddressZero);
        expect(failedMessage.originalSourceChainSelector).eq(0);
        expect(failedMessage.tokenAmount).eq(0);
        expect(failedMessage.status).eq(MessageStatus.Pending);
      });
    });

    describe('supportsInterface', () => {
      it('supports IMidasCCTFailedMessageFallback and IMidasCCTFallbackEscrow', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { escrow } = fixture;

        const failedMessageFallbackId =
          IMidasCCTFailedMessageFallback__factory.createInterface().getSighash(
            'onFailedMessage(address,uint256,uint64)',
          );

        // Solidity's type(IDerived).interfaceId XORs only selectors declared on the
        // derived interface itself, not selectors inherited from parent interfaces.
        const escrowIface = IMidasCCTFallbackEscrow__factory.createInterface();
        const escrowInterfaceId = ethers.utils.hexZeroPad(
          escrowIface.fragments
            .filter(
              (fragment) =>
                fragment.type === 'function' &&
                fragment.name !== 'onFailedMessage',
            )
            .reduce(
              (acc, fragment) => acc.xor(escrowIface.getSighash(fragment)),
              ethers.constants.Zero,
            )
            .toHexString(),
          4,
        );

        expect(await escrow.supportsInterface(failedMessageFallbackId)).eq(
          true,
        );
        expect(await escrow.supportsInterface(escrowInterfaceId)).eq(true);
        expect(await escrow.supportsInterface('0x01ffc9a7')).eq(true);
        expect(await escrow.supportsInterface('0xffffffff')).eq(false);
      });
    });
  });

  describe('Gas estimation', () => {
    const RELEASE_OR_MINT_SIG =
      'releaseOrMint((bytes,uint64,address,uint256,address,bytes,bytes,bytes))';

    // Measured on fresh fixtures; bounds include ~5-10% headroom.
    // Worst path: escrow FallbackHit + onFailedMessage (~300k).
    const GAS_MAX = {
      directMint: 130_000,
      eoaFallbackHit: 160_000,
      contractNoCallbackFallbackHit: 160_000,
      escrowFallbackHitWithCallback: 320_000,
      fallbackFailBothBlacklisted: 110_000,
      fallbackFailPaused: 120_000,
      fallbackFailMinterRevoked: 100_000,
      fallbackFailCallbackReverts: 165_000,
      permissionedDirectMint: 135_000,
      permissionedEoaFallbackHit: 160_000,
      permissionedFallbackFail: 125_000,
      permissionedEscrowFallbackHitWithCallback: 320_000,
      permissionedFallbackFailCallbackReverts: 165_000,
    } as const;

    const buildReleaseOrMintIn = (params: {
      fixture: Fixture;
      receiver: string;
      localToken: string;
    }) => {
      const { fixture, receiver, localToken } = params;
      return {
        originalSender: fixture.owner.address,
        remoteChainSelector: fixture.remoteChainSelector,
        receiver,
        sourceDenominatedAmount: parseUnits('100'),
        localToken,
        sourcePoolAddress: fixture.remotePoolAddress,
        sourcePoolData: encodeDecimals(18),
        offchainTokenData: '0x',
      };
    };

    type ReleaseOrMintInput = ReturnType<typeof buildReleaseOrMintIn>;

    const measureReleaseOrMint = async (params: {
      pool: Fixture['pool'];
      offRamp: Fixture['offRamp'];
      input: ReleaseOrMintInput;
    }) => {
      const { pool, offRamp, input } = params;
      const estimated = await pool
        .connect(offRamp)
        .estimateGas[RELEASE_OR_MINT_SIG](input);

      const tx = await pool
        .connect(offRamp)
        [RELEASE_OR_MINT_SIG](input, { gasLimit: estimated.mul(2) });
      const receipt = await tx.wait();

      const eventNames =
        receipt.events
          ?.map((e) => e.event)
          .filter((name): name is string => typeof name === 'string') ?? [];

      const fallbackHit = receipt.events?.find(
        (e) => e.event === 'FallbackHit',
      );

      return {
        gasUsed: receipt.gasUsed,
        eventNames,
        withCallback: fallbackHit?.args?.withCallback as boolean | undefined,
      };
    };

    const deployPermissionedPool = async (
      fixture: Fixture,
      fallbackReceiver: string,
    ) => {
      const {
        owner,
        accessControl,
        rmn,
        router,
        remoteChainSelector,
        remotePoolAddress,
        remoteTokenAddress,
      } = fixture;

      const TokenFactory = await ethers.getContractFactory(
        'mTokenPermissionedTest',
      );
      const token = await TokenFactory.deploy();
      await token.initialize(accessControl.address);

      const minterRole = await token.M_TOKEN_TEST_MINT_OPERATOR_ROLE();
      const burnerRole = await token.M_TOKEN_TEST_BURN_OPERATOR_ROLE();
      const pauserRole = await token.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE();
      const greenlistedRole = await token.M_TOKEN_TEST_GREENLISTED_ROLE();

      await accessControl.grantRole(minterRole, owner.address);
      await accessControl.grantRole(burnerRole, owner.address);
      await accessControl.grantRole(pauserRole, owner.address);

      const PoolFactory = await ethers.getContractFactory(
        'MidasCCTBurnMintTokenPool',
      );
      const pool = await PoolFactory.deploy(
        token.address,
        rmn.address,
        router.address,
        fallbackReceiver,
      );

      await accessControl.grantRole(minterRole, pool.address);
      await accessControl.grantRole(burnerRole, pool.address);

      const disabledRateLimiter = {
        isEnabled: false,
        capacity: 0,
        rate: 0,
      };
      await pool.applyChainUpdates(
        [],
        [
          {
            remoteChainSelector,
            remotePoolAddresses: [remotePoolAddress],
            remoteTokenAddress,
            outboundRateLimiterConfig: disabledRateLimiter,
            inboundRateLimiterConfig: disabledRateLimiter,
          },
        ],
      );

      return { token, pool, greenlistedRole };
    };

    const deployEscrowForPool = async (
      fixture: Fixture,
      poolAddress: string,
    ) => {
      const { accessControl, defaultRecipient, owner } = fixture;
      const escrow = await deployProxyContract('MidasCCTFallbackEscrow', [
        accessControl.address,
        poolAddress,
        defaultRecipient.address,
      ]);
      await accessControl.grantRole(
        await escrow.FALLBACK_ESCROW_ADMIN_ROLE(),
        owner.address,
      );
      return escrow;
    };

    describe('mTBILL + EOA fallback (no callback)', () => {
      it('direct mint is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, owner, defaultRecipient, mTBILL } = fixture;

        await setFallbackReceiver(fixture, defaultRecipient);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: owner.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('ReleasedOrMinted');
        expect(eventNames).to.not.include('FallbackHit');
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.directMint);
      });

      it('FallbackHit when receiver is blacklisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          pool,
          offRamp,
          accessControl,
          owner,
          alice,
          defaultRecipient,
          mTBILL,
        } = fixture;

        await setFallbackReceiver(fixture, defaultRecipient);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        const { gasUsed, eventNames, withCallback } =
          await measureReleaseOrMint({
            pool,
            offRamp,
            input: buildReleaseOrMintIn({
              fixture,
              receiver: alice.address,
              localToken: mTBILL.address,
            }),
          });

        expect(eventNames).to.include('FallbackHit');
        expect(withCallback).eq(false);
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.eoaFallbackHit);
      });

      it('FallbackFail when receiver and fallback are both blacklisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          pool,
          offRamp,
          accessControl,
          owner,
          alice,
          defaultRecipient,
          mTBILL,
        } = fixture;

        await setFallbackReceiver(fixture, defaultRecipient);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        await blackList(
          { blacklistable: mTBILL, accessControl, owner },
          defaultRecipient,
        );

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailBothBlacklisted);
      });

      it('FallbackFail when token is paused is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, owner, defaultRecipient, mTBILL } = fixture;

        await setFallbackReceiver(fixture, defaultRecipient);
        await mTBILL.pause();

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: owner.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailPaused);
      });

      it('FallbackFail when minter role is revoked is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const {
          pool,
          offRamp,
          accessControl,
          owner,
          alice,
          defaultRecipient,
          mTBILL,
        } = fixture;

        await setFallbackReceiver(fixture, defaultRecipient);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.minter, pool.address);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailMinterRevoked);
      });
    });

    describe('mTBILL + escrow fallback (with callback)', () => {
      it('direct mint is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, owner, mTBILL } = fixture;

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: owner.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('ReleasedOrMinted');
        expect(eventNames).to.not.include('FallbackHit');
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.directMint);
      });

      it('FallbackHit + onFailedMessage when receiver is blacklisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, accessControl, owner, alice, mTBILL } = fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        const { gasUsed, eventNames, withCallback } =
          await measureReleaseOrMint({
            pool,
            offRamp,
            input: buildReleaseOrMintIn({
              fixture,
              receiver: alice.address,
              localToken: mTBILL.address,
            }),
          });

        expect(eventNames).to.include('FallbackHit');
        expect(withCallback).eq(true);
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.escrowFallbackHitWithCallback);
      });

      it('FallbackFail when escrow is blacklisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, accessControl, owner, alice, escrow, mTBILL } =
          fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        await blackList(
          { blacklistable: mTBILL, accessControl, owner },
          escrow.address,
        );

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailBothBlacklisted);
      });

      it('FallbackFail when token is paused is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, owner, mTBILL } = fixture;

        await mTBILL.pause();

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: owner.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailPaused);
      });

      it('FallbackFail when minter role is revoked is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, accessControl, owner, alice, mTBILL } = fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        const roles = getRolesForToken('mTBILL');
        await accessControl.revokeRole(roles.minter, pool.address);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailMinterRevoked);
      });
    });

    describe('mTBILL + contract fallback without callback', () => {
      it('FallbackHit without callback when receiver is blacklisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, accessControl, owner, alice, mTBILL } = fixture;

        const mock = await new ERC20Mock__factory(owner).deploy(18);
        await setFallbackReceiver(fixture, mock.address);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        const { gasUsed, eventNames, withCallback } =
          await measureReleaseOrMint({
            pool,
            offRamp,
            input: buildReleaseOrMintIn({
              fixture,
              receiver: alice.address,
              localToken: mTBILL.address,
            }),
          });

        expect(eventNames).to.include('FallbackHit');
        expect(withCallback).eq(false);
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.contractNoCallbackFallbackHit);
      });
    });

    describe('mTBILL + reverting callback fallback', () => {
      it('FallbackFail when fallback mint succeeds but callback reverts is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { pool, offRamp, accessControl, owner, alice, mTBILL } = fixture;

        const RevertingFactory = await ethers.getContractFactory(
          'MidasCCTFailedMessageFallbackRevertingTester',
        );
        const reverting = await RevertingFactory.deploy();
        await setFallbackReceiver(fixture, reverting.address);
        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: mTBILL.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.fallbackFailCallbackReverts);
      });
    });

    describe('mTokenPermissionedTest + EOA fallback', () => {
      it('direct mint is bounded (receiver greenlisted)', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, accessControl, alice, defaultRecipient } = fixture;

        const { token, pool, greenlistedRole } = await deployPermissionedPool(
          fixture,
          defaultRecipient.address,
        );
        await accessControl.grantRole(greenlistedRole, alice.address);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: token.address,
          }),
        });

        expect(eventNames).to.include('ReleasedOrMinted');
        expect(eventNames).to.not.include('FallbackHit');
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.permissionedDirectMint);
      });

      it('FallbackHit when receiver is not greenlisted and fallback is greenlisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, accessControl, alice, defaultRecipient } = fixture;

        const { token, pool, greenlistedRole } = await deployPermissionedPool(
          fixture,
          defaultRecipient.address,
        );
        await accessControl.grantRole(
          greenlistedRole,
          defaultRecipient.address,
        );

        const { gasUsed, eventNames, withCallback } =
          await measureReleaseOrMint({
            pool,
            offRamp,
            input: buildReleaseOrMintIn({
              fixture,
              receiver: alice.address,
              localToken: token.address,
            }),
          });

        expect(eventNames).to.include('FallbackHit');
        expect(withCallback).eq(false);
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(GAS_MAX.permissionedEoaFallbackHit);
      });

      it('FallbackFail when neither receiver nor fallback is greenlisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, alice, defaultRecipient } = fixture;

        const { token, pool } = await deployPermissionedPool(
          fixture,
          defaultRecipient.address,
        );

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: token.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.permissionedFallbackFail);
      });

      it('FallbackFail when token is paused is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, accessControl, alice, defaultRecipient } = fixture;

        const { token, pool, greenlistedRole } = await deployPermissionedPool(
          fixture,
          defaultRecipient.address,
        );
        await accessControl.grantRole(greenlistedRole, alice.address);
        await accessControl.grantRole(
          greenlistedRole,
          defaultRecipient.address,
        );
        await token.pause();

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: token.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.permissionedFallbackFail);
      });
    });

    describe('mTokenPermissionedTest + escrow fallback', () => {
      it('FallbackHit + onFailedMessage is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, accessControl, alice, defaultRecipient } = fixture;

        const { token, pool, greenlistedRole } = await deployPermissionedPool(
          fixture,
          defaultRecipient.address,
        );
        const escrow = await deployEscrowForPool(fixture, pool.address);
        await pool.setFallbackReceiver(escrow.address);
        await accessControl.grantRole(greenlistedRole, escrow.address);

        const { gasUsed, eventNames, withCallback } =
          await measureReleaseOrMint({
            pool,
            offRamp,
            input: buildReleaseOrMintIn({
              fixture,
              receiver: alice.address,
              localToken: token.address,
            }),
          });

        expect(eventNames).to.include('FallbackHit');
        expect(withCallback).eq(true);
        expect(eventNames).to.not.include('FallbackFail');
        expect(gasUsed).to.lte(
          GAS_MAX.permissionedEscrowFallbackHitWithCallback,
        );
      });

      it('FallbackFail when escrow is not greenlisted is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, alice, defaultRecipient } = fixture;

        const { token, pool } = await deployPermissionedPool(
          fixture,
          defaultRecipient.address,
        );
        const escrow = await deployEscrowForPool(fixture, pool.address);
        await pool.setFallbackReceiver(escrow.address);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: token.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.permissionedFallbackFail);
      });
    });

    describe('mTokenPermissionedTest + reverting callback fallback', () => {
      it('FallbackFail when fallback mint succeeds but callback reverts is bounded', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { offRamp, accessControl, alice } = fixture;

        const RevertingFactory = await ethers.getContractFactory(
          'MidasCCTFailedMessageFallbackRevertingTester',
        );
        const reverting = await RevertingFactory.deploy();

        const { token, pool, greenlistedRole } = await deployPermissionedPool(
          fixture,
          reverting.address,
        );
        await accessControl.grantRole(greenlistedRole, reverting.address);

        const { gasUsed, eventNames } = await measureReleaseOrMint({
          pool,
          offRamp,
          input: buildReleaseOrMintIn({
            fixture,
            receiver: alice.address,
            localToken: token.address,
          }),
        });

        expect(eventNames).to.include('FallbackFail');
        expect(eventNames).to.not.include('FallbackHit');
        expect(gasUsed).to.lte(GAS_MAX.permissionedFallbackFailCallbackReverts);
      });
    });
  });
});
