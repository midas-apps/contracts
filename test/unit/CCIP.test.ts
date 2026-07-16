import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { getRolesForToken } from '../../helpers/roles';
import {
  ERC20Mock__factory,
  MidasCCTBurnMintTokenPool__factory,
} from '../../typechain-types';
import { blackList } from '../common/ac.helpers';
import {
  encodeDecimals,
  lockOrBurn,
  releaseOrMint,
  setFallbackReceiver,
} from '../common/ccip.helpers';
import { mintToken } from '../common/common.helpers';
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

describe('CCIP', function () {
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

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100') },
          { revertMessage: 'WMAC: hasnt role' },
        );
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

      it('mints to the fallback receiver when the receiver is blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice } = fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);

        await releaseOrMint(fixture, {
          amount: parseUnits('100'),
          receiver: alice.address,
          expectFallback: true,
        });
      });

      it('should fail: when the receiver and fallback receiver are both blacklisted', async () => {
        const fixture = await loadFixture(ccipCctFixture);
        const { mTBILL, accessControl, owner, alice, fallbackReceiver } =
          fixture;

        await blackList({ blacklistable: mTBILL, accessControl, owner }, alice);
        await blackList(
          { blacklistable: mTBILL, accessControl, owner },
          fallbackReceiver,
        );

        await releaseOrMint(
          fixture,
          { amount: parseUnits('100'), receiver: alice.address },
          { revertMessage: 'WMAC: has role' },
        );
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
});
