import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractFactory,
  ContractReceipt,
  constants,
} from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';

import {
  CCIP_V2_DEFAULT_TOKEN_GAS,
  CCIP_V2_BASIC_EXTRA_ARGS,
  CCIP_V2_SOURCE_TOKEN_DATA_BYTES,
  CCIP_V2_WAIT_FOR_FINALITY,
  MessageExecutionState,
  abiEncodedAddress,
  buildTokenOnlyMessage,
  buildTokenTransferV1,
  ccipV2LaneFixture,
  encodedLocalDecimals,
  executeV2,
  sendPreparedV2,
  sendV2,
} from '../../common/ccip-v2.fixture';
import {
  ccipEscrow,
  ccipPool,
  ccipPoolFactory,
  expectFundedRecovery,
  expectedRecoveryId,
} from '../../common/ccip.helpers';
import { deployProxyContract } from '../../common/deploy.helpers';

const LOCK_OR_BURN_V2 =
  'lockOrBurn((bytes,uint64,address,uint256,address),bytes4,bytes)';
const RELEASE_OR_MINT_V2 =
  'releaseOrMint((bytes,uint64,address,uint256,address,bytes,bytes,bytes),bytes4)';

const disabledRateLimiter = {
  isEnabled: false,
  capacity: 0,
  rate: 0,
};

const deploy = async (name: string, ...args: unknown[]) => {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract;
};

const impersonate = async (address: string) => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  await network.provider.send('hardhat_setBalance', [
    address,
    '0x56BC75E2D63100000',
  ]);
  return ethers.getSigner(address);
};

const parseEvent = (
  receipt: ContractReceipt,
  contract: Contract,
  eventName: string,
) => {
  const topic = contract.interface.getEventTopic(eventName);
  const log = receipt.logs.find(
    (candidate) =>
      candidate.address.toLowerCase() === contract.address.toLowerCase() &&
      candidate.topics[0] === topic,
  );
  if (!log) throw new Error(`${eventName} was not emitted`);
  return contract.interface.parseLog(log);
};

const sourceSnapshot = async (
  lane: Awaited<ReturnType<typeof ccipV2LaneFixture>>,
) => ({
  alice: (await lane.a.token.balanceOf(lane.alice.address)).toString(),
  pool: (await lane.a.token.balanceOf(lane.a.pool.address)).toString(),
  supply: (await lane.a.token.totalSupply()).toString(),
  nextMessageNumber: (
    await lane.a.onRamp.getExpectedNextMessageNumber(lane.b.selector)
  ).toString(),
  escrowBalance: (
    await lane.a.token.balanceOf(lane.a.escrow.address)
  ).toString(),
});

const expectSourceSnapshotUnchanged = async (
  lane: Awaited<ReturnType<typeof ccipV2LaneFixture>>,
  before: Awaited<ReturnType<typeof sourceSnapshot>>,
) => expect(await sourceSnapshot(lane)).deep.eq(before);

const setRateLimits = (
  pool: Contract,
  remoteChainSelector: BigNumberish,
  outbound: { isEnabled: boolean; capacity: BigNumberish; rate: BigNumberish },
  inbound = disabledRateLimiter,
) =>
  pool.setRateLimitConfig([
    {
      remoteChainSelector,
      fastFinality: false,
      outboundRateLimiterConfig: outbound,
      inboundRateLimiterConfig: inbound,
    },
  ]);

const decodeOutbound = async (encodedMessage: string) => {
  const imports = await deploy('CCIPV2TestImports');
  return imports.decodeMessageV1(encodedMessage);
};

const encodedSender = (decodedMessage: { sender: string }) =>
  ethers.utils.defaultAbiCoder.decode(
    ['address'],
    decodedMessage.sender,
  )[0] as string;

const buildReleaseOrMintInput = (
  lane: Awaited<ReturnType<typeof ccipV2LaneFixture>>,
  overrides: Partial<{
    originalSender: string;
    remoteChainSelector: BigNumberish;
    receiver: string;
    sourceDenominatedAmount: BigNumberish;
    localToken: string;
    sourcePoolAddress: string;
    sourcePoolData: string;
    offchainTokenData: string;
  }> = {},
) => ({
  originalSender: abiEncodedAddress(lane.alice.address),
  remoteChainSelector: lane.a.selector,
  receiver: lane.bob.address,
  sourceDenominatedAmount: 1,
  localToken: lane.b.token.address,
  sourcePoolAddress: abiEncodedAddress(lane.a.pool.address),
  sourcePoolData: encodedLocalDecimals(),
  offchainTokenData: '0x',
  ...overrides,
});

const destinationTokenSnapshot = async (
  lane: Awaited<ReturnType<typeof ccipV2LaneFixture>>,
  extraAddresses: string[] = [],
) => {
  const addresses = [
    lane.bob.address,
    lane.b.pool.address,
    lane.b.escrow.address,
    ...extraAddresses,
  ];
  const balances = await Promise.all(
    addresses.map((address) => lane.b.token.balanceOf(address)),
  );
  return {
    balances: balances.map((balance) => balance.toString()),
    supply: (await lane.b.token.totalSupply()).toString(),
  };
};

const pendingRecoveryCount = async (escrow: Contract) => {
  return ccipEscrow(escrow.address, escrow.signer).pendingCount();
};

const firstRecoveryId = async (
  lane: Awaited<ReturnType<typeof ccipV2LaneFixture>>,
  recipient: string,
  amount: BigNumberish,
) =>
  expectedRecoveryId({
    chainId: (await ethers.provider.getNetwork()).chainId,
    escrow: lane.b.escrow.address,
    nonce: 0,
    originalSender: lane.alice.address,
    originalRecipient: recipient,
    sourceSelector: lane.a.selector,
    amount,
  });

const installDestinationPool = async (
  lane: Awaited<ReturnType<typeof ccipV2LaneFixture>>,
  rejectingFallback: boolean | undefined,
) => {
  const factory = await ccipPoolFactory(lane.owner);
  const poolDeployment = await factory.deploy(
    lane.b.token.address,
    lane.b.rmn.address,
    lane.b.router.address,
  );
  await poolDeployment.deployed();

  const actualFactory = await ethers.getContractFactory(
    'MidasCCTBurnMintTokenPool',
  );
  const pool = actualFactory.attach(poolDeployment.address).connect(lane.owner);
  await pool.applyChainUpdates(
    [],
    [
      {
        remoteChainSelector: lane.a.selector,
        remotePoolAddresses: [abiEncodedAddress(lane.a.pool.address)],
        remoteTokenAddress: abiEncodedAddress(lane.a.token.address),
        outboundRateLimiterConfig: disabledRateLimiter,
        inboundRateLimiterConfig: disabledRateLimiter,
      },
    ],
  );
  await lane.accessControl.grantRole(lane.b.minterRole, pool.address);
  await lane.accessControl.grantRole(lane.b.greenlistedRole, pool.address);

  let fallback: Contract | undefined;
  if (rejectingFallback !== undefined) {
    fallback = await deploy(
      'CCIPV2FallbackReceiverTester',
      pool.address,
      rejectingFallback,
    );
    await lane.accessControl.grantRole(
      lane.b.greenlistedRole,
      fallback.address,
    );
    await ccipPool(pool.address, lane.owner).setFallbackReceiver(
      fallback.address,
    );
  }

  await lane.b.registry.setPool(lane.b.token.address, pool.address);
  return { pool, fallback };
};

describe('Midas CCIP pool', () => {
  describe('construction and configuration', () => {
    it('deploys with three arguments and starts with no fallback receiver', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const factory = await ccipPoolFactory(lane.owner);
      const pool = await factory.deploy(
        lane.a.token.address,
        lane.a.rmn.address,
        lane.a.router.address,
      );
      await pool.deployed();
      expect(await pool.fallbackReceiver()).eq(constants.AddressZero);
    });

    it('rejects a zero token, RMN, or Router independently', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const actualFactory = (await ethers.getContractFactory(
        'MidasCCTBurnMintTokenPool',
      )) as ContractFactory;
      const valid = {
        token: lane.a.token.address,
        rmn: lane.a.rmn.address,
        router: lane.a.router.address,
      };

      for (const field of ['token', 'rmn', 'router'] as const) {
        const invalid = { ...valid, [field]: constants.AddressZero };
        await expect(
          actualFactory.deploy(invalid.token, invalid.rmn, invalid.router),
        ).revertedWithCustomError(lane.a.pool, 'ZeroAddressInvalid');
      }
    });

    it('rejects a token whose decimals are not the fixed Midas value', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const token = await deploy('ERC20Mock', 6);
      const factory = (await ethers.getContractFactory(
        'MidasCCTBurnMintTokenPool',
      )) as ContractFactory;
      await expect(
        factory.deploy(
          token.address,
          lane.a.rmn.address,
          lane.a.router.address,
        ),
      )
        .revertedWithCustomError(lane.a.pool, 'InvalidDecimalArgs')
        .withArgs(18, 6);
    });

    it('links one compatible escrow and emits the old and new receiver', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const factory = (await ethers.getContractFactory(
        'MidasCCTBurnMintTokenPool',
      )) as ContractFactory;
      const currentPool = await factory.deploy(
        lane.a.token.address,
        lane.a.rmn.address,
        lane.a.router.address,
      );
      await currentPool.deployed();
      const escrow = await deployProxyContract('MidasCCTFallbackEscrow', [
        lane.accessControl.address,
        currentPool.address,
        lane.defaultRecipient.address,
      ]);
      const pool = ccipPool(currentPool.address, lane.owner);

      await expect(pool.setFallbackReceiver(escrow.address))
        .to.emit(pool, 'FallbackReceiverSet')
        .withArgs(constants.AddressZero, escrow.address);
      expect(await pool.fallbackReceiver()).eq(escrow.address);
    });

    it('prevents a non-owner from linking the fallback receiver', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const before = await lane.a.pool.fallbackReceiver();
      await expect(
        lane.a.pool
          .connect(lane.alice)
          .setFallbackReceiver(lane.defaultRecipient.address),
      ).reverted;
      expect(await lane.a.pool.fallbackReceiver()).eq(before);
    });

    it('rejects zero and prevents replacing a linked escrow', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pool = ccipPool(lane.a.pool.address, lane.owner);
      const replacement = await deploy(
        'CCIPV2FallbackReceiverTester',
        lane.a.pool.address,
        false,
      );
      const linked = await pool.fallbackReceiver();

      await expect(pool.setFallbackReceiver(constants.AddressZero))
        .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
        .withArgs(constants.AddressZero);
      await expect(pool.setFallbackReceiver(replacement.address))
        .revertedWithCustomError(pool, 'FallbackReceiverAlreadyConfigured')
        .withArgs(linked);
      expect(await pool.fallbackReceiver()).eq(linked);
    });

    it('rejects an EOA fallback receiver', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pool = ccipPool(lane.a.pool.address, lane.owner);
      await expect(pool.setFallbackReceiver(lane.unlisted.address))
        .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
        .withArgs(lane.unlisted.address);
    });

    it('rejects a contract without the fallback interface', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pool = ccipPool(lane.a.pool.address, lane.owner);
      const receivers = [
        await deploy('CCIPV2NoFallbackInterface'),
        await deploy('CCIPV2RevertingFallbackReceiverTester'),
      ];
      for (const receiver of receivers) {
        await expect(pool.setFallbackReceiver(receiver.address))
          .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
          .withArgs(receiver.address);
      }
    });

    it('rejects a fallback receiver tied to another pool', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pool = ccipPool(lane.a.pool.address, lane.owner);
      const receiver = await deploy(
        'CCIPV2FallbackReceiverTester',
        lane.b.pool.address,
        false,
      );
      await expect(pool.setFallbackReceiver(receiver.address))
        .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
        .withArgs(receiver.address);
    });

    it('reports the exact inherited pool interfaces only', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const imports = await deploy('CCIPV2TestImports');
      expect(await lane.a.pool.supportsInterface('0x01ffc9a7')).eq(true);
      expect(
        await lane.a.pool.supportsInterface(await imports.poolV1InterfaceId()),
      ).eq(true);
      expect(
        await lane.a.pool.supportsInterface(
          await imports.ccipPoolV1InterfaceId(),
        ),
      ).eq(true);
      expect(
        await lane.a.pool.supportsInterface(await imports.poolV2InterfaceId()),
      ).eq(true);
      expect(await lane.a.pool.supportsInterface('0xffffffff')).eq(false);
    });

    it('leaves the pool fee override disabled and uses FeeQuoter', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('4', 18);
      const config = await lane.a.pool.getTokenTransferFeeConfig(
        lane.a.token.address,
        lane.b.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
        '0x',
      );
      expect(config.isEnabled).eq(false);
      expect(config.finalityTransferFeeBps).eq(0);

      const aliceBefore = await lane.a.token.balanceOf(lane.alice.address);
      const supplyBefore = await lane.a.token.totalSupply();
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      const tokenReceipt = outbound.receipts.find(
        (receipt) =>
          receipt.issuer.toLowerCase() === lane.a.pool.address.toLowerCase(),
      );
      expect(tokenReceipt).not.eq(undefined);

      expect(await lane.a.token.balanceOf(lane.alice.address)).eq(
        aliceBefore.sub(amount),
      );
      expect(await lane.a.token.totalSupply()).eq(supplyBefore.sub(amount));
      expect(tokenReceipt?.destGasLimit).eq(CCIP_V2_DEFAULT_TOKEN_GAS);
      expect(tokenReceipt?.destBytesOverhead).eq(
        CCIP_V2_SOURCE_TOKEN_DATA_BYTES,
      );
    });

    it('keeps wait-for-finality as the prepared-message default', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      expect(await lane.a.pool.getAllowedFinalityConfig()).eq(
        CCIP_V2_WAIT_FOR_FINALITY,
      );
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect(outbound.message.extraArgs.slice(18, 26)).eq(
        CCIP_V2_WAIT_FOR_FINALITY.slice(2),
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
    });

    it('starts without an advanced hook', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      expect(await lane.a.pool.getAdvancedPoolHooks()).eq(
        constants.AddressZero,
      );
    });

    it('changes ownership only after the pending owner accepts', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await lane.a.pool.transferOwnership(lane.carol.address);
      expect(await lane.a.pool.owner()).eq(lane.owner.address);
      await expect(lane.a.pool.connect(lane.unlisted).acceptOwnership())
        .reverted;
      expect(await lane.a.pool.owner()).eq(lane.owner.address);
      await lane.a.pool.connect(lane.carol).acceptOwnership();
      expect(await lane.a.pool.owner()).eq(lane.carol.address);
    });

    it('protects every inherited owner configuration boundary', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pool = lane.a.pool.connect(lane.unlisted);
      const remotePool = abiEncodedAddress(lane.b.pool.address);
      const before = {
        remotes: await lane.a.pool.getRemotePools(lane.b.selector),
        dynamic: await lane.a.pool.getDynamicConfig(),
        finality: await lane.a.pool.getAllowedFinalityConfig(),
        hook: await lane.a.pool.getAdvancedPoolHooks(),
        fee: await lane.a.pool.getTokenTransferFeeConfig(
          lane.a.token.address,
          lane.b.selector,
          CCIP_V2_WAIT_FOR_FINALITY,
          '0x',
        ),
      };
      const calls = [
        () => pool.applyChainUpdates([], []),
        () => pool.addRemotePool(lane.b.selector, remotePool),
        () => pool.removeRemotePool(lane.b.selector, remotePool),
        () =>
          pool.setDynamicConfig(
            lane.a.router.address,
            lane.carol.address,
            lane.carol.address,
          ),
        () => pool.setAllowedFinalityConfig('0x00000001'),
        () => pool.updateAdvancedPoolHooks(lane.carol.address),
        () => pool.applyTokenTransferFeeConfigUpdates([], []),
      ];
      for (const call of calls) await expect(call()).reverted;

      expect(await lane.a.pool.getRemotePools(lane.b.selector)).deep.eq(
        before.remotes,
      );
      expect(await lane.a.pool.getDynamicConfig()).deep.eq(before.dynamic);
      expect(await lane.a.pool.getAllowedFinalityConfig()).eq(before.finality);
      expect(await lane.a.pool.getAdvancedPoolHooks()).eq(before.hook);
      expect(
        await lane.a.pool.getTokenTransferFeeConfig(
          lane.a.token.address,
          lane.b.selector,
          CCIP_V2_WAIT_FOR_FINALITY,
          '0x',
        ),
      ).deep.eq(before.fee);
    });

    it('accepts old and replacement remote pools until one is removed', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const oldPool = abiEncodedAddress(lane.a.pool.address);
      const replacementPool = abiEncodedAddress(lane.unlisted.address);
      await lane.b.pool.addRemotePool(lane.a.selector, replacementPool);

      const oldTransfer = buildTokenTransferV1(
        lane.a,
        lane.b,
        lane.carol.address,
        amount,
      );
      const replacementTransfer = {
        ...buildTokenTransferV1(lane.a, lane.b, lane.alice.address, amount),
        sourcePoolAddress: replacementPool,
      };
      const sender = abiEncodedAddress(lane.alice.address);
      await lane.b.offRamp.releaseOrMintAndMeasure(
        oldTransfer,
        sender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
      await lane.b.offRamp.releaseOrMintAndMeasure(
        replacementTransfer,
        sender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );

      await lane.b.pool.removeRemotePool(lane.a.selector, oldPool);
      await expect(
        lane.b.offRamp.releaseOrMintAndMeasure(
          oldTransfer,
          sender,
          lane.a.selector,
          CCIP_V2_WAIT_FOR_FINALITY,
        ),
      ).revertedWithCustomError(lane.b.offRamp, 'TokenHandlingError');
      await expect(
        lane.b.offRamp.releaseOrMintAndMeasure(
          replacementTransfer,
          sender,
          lane.a.selector,
          CCIP_V2_WAIT_FOR_FINALITY,
        ),
      ).not.reverted;
    });

    it('permits only the configured rate-limit admin to update an edge', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await lane.a.pool.setDynamicConfig(
        lane.a.router.address,
        lane.carol.address,
        constants.AddressZero,
      );
      const update = [
        {
          remoteChainSelector: lane.b.selector,
          fastFinality: false,
          outboundRateLimiterConfig: {
            isEnabled: true,
            capacity: 100,
            rate: 10,
          },
          inboundRateLimiterConfig: disabledRateLimiter,
        },
      ];
      await lane.a.pool.connect(lane.carol).setRateLimitConfig(update);
      const [outbound] = await lane.a.pool.getCurrentRateLimiterState(
        lane.b.selector,
        false,
      );
      expect(outbound.isEnabled).eq(true);
      expect(outbound.capacity).eq(100);
      expect(outbound.rate).eq(10);

      await expect(
        lane.a.pool.connect(lane.unlisted).setRateLimitConfig(update),
      ).reverted;
    });

    it('changes ramp authentication and exposes the same Router to return quotes', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const replacementRouter = await deploy(
        'CCIPV2ReturnRouterTester',
        23,
        false,
      );
      await lane.a.pool.setDynamicConfig(
        replacementRouter.address,
        constants.AddressZero,
        constants.AddressZero,
      );
      expect((await lane.a.pool.getDynamicConfig()).router).eq(
        replacementRouter.address,
      );

      await expect(sendV2(lane.a, lane.b, lane.alice, lane.bob.address, 1))
        .reverted;

      const escrow = ccipEscrow(lane.a.escrow.address, lane.owner);
      const nonce = await escrow.recoveryCount();
      const recoveryId = expectedRecoveryId({
        chainId: (await ethers.provider.getNetwork()).chainId,
        escrow: lane.a.escrow.address,
        nonce,
        originalSender: lane.bob.address,
        originalRecipient: lane.alice.address,
        sourceSelector: lane.b.selector,
        amount: 1,
      });
      await lane.a.token.mint(lane.a.escrow.address, 1);
      await ccipEscrow(
        lane.a.escrow.address,
        await impersonate(lane.a.pool.address),
      ).onFallbackMinted(
        lane.bob.address,
        lane.alice.address,
        lane.b.selector,
        1,
      );

      expect(await escrow.getReturnToSourceFee(recoveryId)).eq(23);
    });

    it('runs inherited preflight and postflight hooks exactly once', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const sourceHook = await deploy('CCIPV2AdvancedPoolHooksTester');
      const destinationHook = await deploy('CCIPV2AdvancedPoolHooksTester');
      await lane.a.pool.updateAdvancedPoolHooks(sourceHook.address);
      await lane.b.pool.updateAdvancedPoolHooks(destinationHook.address);

      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect(await sourceHook.preflightCalls()).eq(1);
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await destinationHook.postflightCalls()).eq(1);

      await sourceHook.setRejectPreflight(true);
      await expect(
        sendV2(lane.a, lane.b, lane.alice, lane.bob.address, 1),
      ).revertedWithCustomError(sourceHook, 'PreflightRejected');
      expect(await sourceHook.preflightCalls()).eq(1);

      await sourceHook.setRejectPreflight(false);
      await destinationHook.setRejectPostflight(true);
      const rejected = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, rejected)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationHook.postflightCalls()).eq(1);
    });

    it('has no Midas fee override or retained token principal', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const dynamic = await lane.a.pool.getDynamicConfig();
      const fee = await lane.a.pool.getTokenTransferFeeConfig(
        lane.a.token.address,
        lane.b.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
        '0x',
      );
      expect(dynamic.feeAdmin).eq(constants.AddressZero);
      expect(fee.isEnabled).eq(false);
      expect(await lane.a.token.balanceOf(lane.a.pool.address)).eq(0);

      await sendV2(lane.a, lane.b, lane.alice, lane.bob.address, 1);
      expect(await lane.a.token.balanceOf(lane.a.pool.address)).eq(0);
    });

    it('keeps only the escrow behind an implementation proxy', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const implementationSlot = BigNumber.from(
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes('eip1967.proxy.implementation'),
        ),
      )
        .sub(1)
        .toHexString();
      const poolValue = await ethers.provider.getStorageAt(
        lane.a.pool.address,
        implementationSlot,
      );
      const escrowValue = await ethers.provider.getStorageAt(
        lane.a.escrow.address,
        implementationSlot,
      );
      expect(BigNumber.from(poolValue)).eq(0);
      expect(BigNumber.from(escrowValue)).not.eq(0);
    });
  });

  describe('source Router, token policy, and burn', () => {
    it('burns the full principal and encodes the direct EOA Router caller', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('11', 18);
      const balanceBefore = await lane.a.token.balanceOf(lane.alice.address);
      const supplyBefore = await lane.a.token.totalSupply();

      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      const decoded = await decodeOutbound(outbound.encodedMessage);

      expect(encodedSender(decoded)).eq(lane.alice.address);
      expect(decoded.tokenTransfer[0].amount).eq(amount);
      expect(await lane.a.token.balanceOf(lane.alice.address)).eq(
        balanceBefore.sub(amount),
      );
      expect(await lane.a.token.balanceOf(lane.a.pool.address)).eq(0);
      expect(await lane.a.token.totalSupply()).eq(supplyBefore.sub(amount));
      expect(outbound.fee).gt(0);
    });

    it('encodes a smart Router caller, not its controller, as originalSender', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const wrapper = await deploy('CCIPV2RouterCaller');
      const amount = parseUnits('7', 18);
      await lane.accessControl.grantRole(
        lane.a.greenlistedRole,
        wrapper.address,
      );
      await lane.a.token.connect(lane.alice).transfer(wrapper.address, amount);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);

      const receipt = await (
        await wrapper
          .connect(lane.alice)
          .send(lane.a.router.address, lane.b.selector, message, { value: fee })
      ).wait();
      const sent = parseEvent(receipt, lane.a.onRamp, 'CCIPMessageSent');
      const decoded = await decodeOutbound(sent.args.encodedMessage);

      expect(encodedSender(decoded)).eq(wrapper.address);
      expect(encodedSender(decoded)).not.eq(lane.alice.address);
      expect(await lane.a.token.balanceOf(wrapper.address)).eq(0);
    });

    it('rolls back a source send when the Router caller has insufficient balance', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.carol)
        .approve(lane.a.router.address, amount);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.carol)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rolls back a source send when the Router caller has insufficient allowance', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a blacklisted Router caller during token collection', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      await lane.accessControl.grantRole(
        await lane.a.token.BLACKLISTED_ROLE(),
        lane.alice.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a non-greenlisted Router caller during token collection', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      await lane.accessControl.revokeRole(
        lane.a.greenlistedRole,
        lane.alice.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a blacklisted source pool during Router collection', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      await lane.accessControl.grantRole(
        await lane.a.token.BLACKLISTED_ROLE(),
        lane.a.pool.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a non-greenlisted source pool during Router collection', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      await lane.accessControl.revokeRole(
        lane.a.greenlistedRole,
        lane.a.pool.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a source send while the token is paused', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      await lane.accessControl.grantRole(
        await lane.a.token.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE(),
        lane.owner.address,
      );
      await lane.a.token.pause();
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects an unsupported destination before committing a message', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const unsupportedSelector = BigNumber.from(999);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        1,
        lane.bob.address,
      );
      await lane.a.token.connect(lane.alice).approve(lane.a.router.address, 1);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(unsupportedSelector, message),
      )
        .revertedWithCustomError(lane.a.router, 'UnsupportedDestinationChain')
        .withArgs(unsupportedSelector);
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects the wrong local token before burning', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const onRamp = await impersonate(lane.a.onRamp.address);
      await expect(
        lane.a.pool.connect(onRamp)[LOCK_OR_BURN_V2](
          {
            receiver: abiEncodedAddress(lane.bob.address),
            remoteChainSelector: lane.b.selector,
            originalSender: lane.alice.address,
            amount: 1,
            localToken: lane.b.token.address,
          },
          CCIP_V2_WAIT_FOR_FINALITY,
          '0x',
        ),
      )
        .revertedWithCustomError(lane.a.pool, 'InvalidToken')
        .withArgs(lane.b.token.address);
    });

    it('rejects direct lockOrBurn calls from a non-OnRamp', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await expect(
        lane.a.pool.connect(lane.owner)[LOCK_OR_BURN_V2](
          {
            receiver: abiEncodedAddress(lane.bob.address),
            remoteChainSelector: lane.b.selector,
            originalSender: lane.alice.address,
            amount: 1,
            localToken: lane.a.token.address,
          },
          CCIP_V2_WAIT_FOR_FINALITY,
          '0x',
        ),
      )
        .revertedWithCustomError(lane.a.pool, 'CallerIsNotARampOnRouter')
        .withArgs(lane.owner.address);
    });

    it('rejects an RMN-cursed send and accepts it after repair', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      await lane.a.rmn.setCursed(true);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).revertedWithCustomError(lane.a.router, 'BadARMSignal');
      await expectSourceSnapshotUnchanged(lane, before);

      await lane.a.rmn.setCursed(false);
      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).not.reverted;
    });

    it('rolls back Router collection when the pool lacks its burner role', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('1', 18);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      await lane.accessControl.revokeRole(
        lane.a.burnerRole,
        lane.a.pool.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).reverted;
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a zero token amount in OnRamp 2.0', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        0,
        lane.bob.address,
      );
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).revertedWithCustomError(lane.a.onRamp, 'CannotSendZeroTokens');
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('rejects a transfer above outbound capacity atomically', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await setRateLimits(lane.a.pool, lane.b.selector, {
        isEnabled: true,
        capacity: 100,
        rate: 10,
      });
      const amount = 101;
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).revertedWithCustomError(lane.a.pool, 'TokenMaxCapacityExceeded');
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('enforces a drained outbound bucket and permits the timed refill', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await setRateLimits(lane.a.pool, lane.b.selector, {
        isEnabled: true,
        capacity: 100,
        rate: 1,
      });
      await sendV2(lane.a, lane.b, lane.alice, lane.bob.address, 100);

      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        10,
        lane.bob.address,
      );
      await lane.a.token.connect(lane.alice).approve(lane.a.router.address, 10);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const before = await sourceSnapshot(lane);
      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).revertedWithCustomError(lane.a.pool, 'TokenRateLimitReached');
      await expectSourceSnapshotUnchanged(lane, before);

      await time.increase(10);
      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee }),
      ).not.reverted;
    });

    it('rejects one wei below the exact native quote atomically', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      expect(fee).gt(0);
      const before = await sourceSnapshot(lane);

      await expect(
        lane.a.router
          .connect(lane.alice)
          .ccipSend(lane.b.selector, message, { value: fee.sub(1) }),
      ).revertedWithCustomError(lane.a.router, 'InsufficientFeeTokenAmount');
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('accepts the exact quote and wraps exactly that native amount', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const message = buildTokenOnlyMessage(
        lane.a.token.address,
        amount,
        lane.bob.address,
      );
      await lane.a.token
        .connect(lane.alice)
        .approve(lane.a.router.address, amount);
      const fee = await lane.a.router.getFee(lane.b.selector, message);
      const wrappedSupplyBefore = await lane.a.wrappedNative.totalSupply();

      const transaction = await lane.a.router
        .connect(lane.alice)
        .ccipSend(lane.b.selector, message, { value: fee });
      await expect(transaction)
        .to.emit(lane.a.wrappedNative, 'Deposit')
        .withArgs(lane.a.router.address, fee);
      expect(await lane.a.wrappedNative.totalSupply()).eq(
        wrappedSupplyBefore.add(fee),
      );
    });

    it('preserves the full principal through the no-override pool path', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('13', 18);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      const decoded = await decodeOutbound(outbound.encodedMessage);
      expect(decoded.tokenTransfer[0].amount).eq(amount);
      expect(outbound.receipts[1].feeTokenAmount).eq(0);
    });

    it('emits the 32-byte ABI encoding of local decimals', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      await lane.a.token.mint(lane.a.pool.address, amount);
      const onRamp = await impersonate(lane.a.onRamp.address);
      const result = await lane.a.pool
        .connect(onRamp)
        .callStatic[LOCK_OR_BURN_V2](
          {
            receiver: abiEncodedAddress(lane.bob.address),
            remoteChainSelector: lane.b.selector,
            originalSender: lane.alice.address,
            amount,
            localToken: lane.a.token.address,
          },
          CCIP_V2_WAIT_FOR_FINALITY,
          '0x',
        );
      expect(result[0].destPoolData).eq(encodedLocalDecimals());
      expect(ethers.utils.arrayify(result[0].destPoolData)).length(32);
    });

    it('rejects two token entries in OnRamp 2.0', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const message = {
        receiver: abiEncodedAddress(lane.bob.address),
        data: '0x',
        tokenAmounts: [
          { token: lane.a.token.address, amount: 1 },
          { token: lane.a.token.address, amount: 1 },
        ],
        feeToken: constants.AddressZero,
        extraArgs: CCIP_V2_BASIC_EXTRA_ARGS,
      };
      await lane.a.token.connect(lane.alice).approve(lane.a.router.address, 2);
      const before = await sourceSnapshot(lane);
      await expect(
        lane.a.router.connect(lane.alice).ccipSend(lane.b.selector, message),
      ).revertedWithCustomError(lane.a.onRamp, 'CanOnlySendOneTokenPerMessage');
      await expectSourceSnapshotUnchanged(lane, before);
    });

    it('keeps direct pool burn independent of originalSender policy', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      await lane.accessControl.grantRole(
        await lane.a.token.BLACKLISTED_ROLE(),
        lane.alice.address,
      );
      await lane.a.token.mint(lane.a.pool.address, amount);
      const onRamp = await impersonate(lane.a.onRamp.address);

      await expect(
        lane.a.pool.connect(onRamp)[LOCK_OR_BURN_V2](
          {
            receiver: abiEncodedAddress(lane.bob.address),
            remoteChainSelector: lane.b.selector,
            originalSender: lane.alice.address,
            amount,
            localToken: lane.a.token.address,
          },
          CCIP_V2_WAIT_FOR_FINALITY,
          '0x',
        ),
      ).not.reverted;
      expect(await lane.a.token.balanceOf(lane.a.pool.address)).eq(0);
    });

    it('accepts exactly one positive base unit', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect(
        (await decodeOutbound(outbound.encodedMessage)).tokenTransfer[0].amount,
      ).eq(1);
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
    });
  });

  describe('destination pool and OffRamp', () => {
    it('directly mints to an eligible destination recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('3', 18);
      const bobBefore = await lane.b.token.balanceOf(lane.bob.address);
      const escrowBefore = await lane.b.token.balanceOf(lane.b.escrow.address);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );

      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(
        bobBefore.add(amount),
      );
      expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(
        escrowBefore,
      );
      expect(await pendingRecoveryCount(lane.b.escrow)).eq(0);
    });

    it('directly mints to a permissioned greenlisted recipient', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      expect(
        await lane.accessControl.hasRole(
          lane.b.greenlistedRole,
          lane.bob.address,
        ),
      ).eq(true);
      const amount = 1;
      const before = await lane.b.token.balanceOf(lane.bob.address);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(before.add(1));
      expect(await pendingRecoveryCount(lane.b.escrow)).eq(0);
    });

    it('registers the original sender when the destination recipient is blacklisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('5', 18);
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const bobBefore = await lane.b.token.balanceOf(lane.bob.address);
      const escrowBefore = await lane.b.token.balanceOf(lane.b.escrow.address);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );

      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(bobBefore);
      expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(
        escrowBefore.add(amount),
      );
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, lane.bob.address, amount),
        originalSender: lane.alice.address,
        originalRecipient: lane.bob.address,
        sourceSelector: lane.a.selector,
        amount,
        returnable: true,
      });
    });

    it('registers the same funded recovery when the destination recipient is not greenlisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = parseUnits('2', 18);
      await lane.accessControl.revokeRole(
        lane.b.greenlistedRole,
        lane.bob.address,
      );
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, lane.bob.address, amount),
        originalSender: lane.alice.address,
        originalRecipient: lane.bob.address,
        sourceSelector: lane.a.selector,
        amount,
        returnable: true,
      });
    });

    it('tracks a recovery when the destination recipient is the escrow itself', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.b.escrow.address,
        amount,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, lane.b.escrow.address, amount),
        originalSender: lane.alice.address,
        originalRecipient: lane.b.escrow.address,
        sourceSelector: lane.a.selector,
        amount,
        returnable: true,
      });
    });

    it('tracks a recovery when the destination recipient is the local pool', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.b.pool.address,
        amount,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.b.token.balanceOf(lane.b.pool.address)).eq(0);
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, lane.b.pool.address, amount),
        originalSender: lane.alice.address,
        originalRecipient: lane.b.pool.address,
        sourceSelector: lane.a.selector,
        amount,
        returnable: true,
      });
    });

    it('preserves a zero destination recipient in an admin-resolvable recovery', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        constants.AddressZero,
        amount,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, constants.AddressZero, amount),
        originalSender: lane.alice.address,
        originalRecipient: constants.AddressZero,
        sourceSelector: lane.a.selector,
        amount,
        returnable: true,
      });
    });

    it('permits direct mint before a fallback escrow is linked', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const { pool } = await installDestinationPool(lane, undefined);
      expect(await ccipPool(pool.address, lane.owner).fallbackReceiver()).eq(
        constants.AddressZero,
      );
      const before = await lane.b.token.balanceOf(lane.bob.address);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.b.token.balanceOf(lane.bob.address)).eq(before.add(1));
    });

    it('fails atomically when primary mint fails before escrow linking', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await installDestinationPool(lane, undefined);
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
    });

    it('rejects an EOA or callback-less fallback before use', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const pool = ccipPool(lane.b.pool.address, lane.owner);
      await expect(pool.setFallbackReceiver(lane.unlisted.address))
        .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
        .withArgs(lane.unlisted.address);
      const callbackless = await deploy('CCIPV2NoFallbackInterface');
      await expect(pool.setFallbackReceiver(callbackless.address))
        .revertedWithCustomError(pool, 'InvalidFallbackReceiver')
        .withArgs(callbackless.address);
    });

    it('reports destination failure when the pool lacks minter authority', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await lane.accessControl.revokeRole(
        lane.b.minterRole,
        lane.b.pool.address,
      );
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
    });

    it('reports destination failure while the token is paused', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await lane.accessControl.grantRole(
        await lane.b.token.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE(),
        lane.owner.address,
      );
      await lane.b.token.pause();
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
    });

    it('rolls back when both the destination recipient and recovery escrow are blacklisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const blacklistRole = await lane.b.token.BLACKLISTED_ROLE();
      await lane.accessControl.grantRole(blacklistRole, lane.bob.address);
      await lane.accessControl.grantRole(blacklistRole, lane.b.escrow.address);
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
    });

    it('rolls back when neither the destination recipient nor recovery escrow is greenlisted', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await lane.accessControl.revokeRole(
        lane.b.greenlistedRole,
        lane.bob.address,
      );
      await lane.accessControl.revokeRole(
        lane.b.greenlistedRole,
        lane.b.escrow.address,
      );
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
    });

    it('rolls back fallback mint when its atomic callback rejects', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const { fallback } = await installDestinationPool(lane, true);
      if (!fallback) throw new Error('rejecting fallback was not installed');
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const before = await destinationTokenSnapshot(lane, [fallback.address]);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane, [fallback.address])).deep.eq(
        before,
      );
    });

    it('rejects every malformed or noncanonical originalSender encoding', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      const pool = ccipPool(lane.b.pool.address, offRamp);
      const addressBytes = lane.alice.address.slice(2);
      const malformed = [
        '0x',
        lane.alice.address,
        `0x${'00'.repeat(31)}`,
        `0x${'00'.repeat(33)}`,
        `0x01${'00'.repeat(11)}${addressBytes}`,
      ];

      for (const originalSender of malformed) {
        await expect(
          pool.callStatic.releaseOrMint(
            buildReleaseOrMintInput(lane, { originalSender }),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
        ).revertedWithCustomError(pool, 'InvalidOriginalSender');
      }
    });

    it('rejects an ABI-encoded zero originalSender', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      const pool = ccipPool(lane.b.pool.address, offRamp);
      await expect(
        pool.callStatic.releaseOrMint(
          buildReleaseOrMintInput(lane, {
            originalSender: abiEncodedAddress(constants.AddressZero),
          }),
          CCIP_V2_WAIT_FOR_FINALITY,
        ),
      ).revertedWithCustomError(pool, 'InvalidOriginalSender');
    });

    it('stores the canonical original sender supplied by OffRamp', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, lane.bob.address, amount),
        originalSender: lane.alice.address,
        originalRecipient: lane.bob.address,
        sourceSelector: lane.a.selector,
        amount,
      });
    });

    it('rejects the wrong destination token before custom minting', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      await expect(
        lane.b.pool
          .connect(offRamp)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane, { localToken: lane.a.token.address }),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      )
        .revertedWithCustomError(lane.b.pool, 'InvalidToken')
        .withArgs(lane.a.token.address);
    });

    it('rejects releaseOrMint from a caller not registered as OffRamp', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await expect(
        lane.b.pool
          .connect(lane.owner)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      )
        .revertedWithCustomError(lane.b.pool, 'CallerIsNotARampOnRouter')
        .withArgs(lane.owner.address);
    });

    it('rejects an unsupported source selector', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      const unsupported = BigNumber.from(999);
      await expect(
        lane.b.pool.connect(offRamp)[RELEASE_OR_MINT_V2](
          buildReleaseOrMintInput(lane, {
            remoteChainSelector: unsupported,
          }),
          CCIP_V2_WAIT_FOR_FINALITY,
        ),
      )
        .revertedWithCustomError(lane.b.pool, 'ChainNotAllowed')
        .withArgs(unsupported);
    });

    it('rejects an unregistered source pool address', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      const wrongPool = abiEncodedAddress(lane.unlisted.address);
      await expect(
        lane.b.pool.connect(offRamp)[RELEASE_OR_MINT_V2](
          buildReleaseOrMintInput(lane, {
            sourcePoolAddress: wrongPool,
          }),
          CCIP_V2_WAIT_FOR_FINALITY,
        ),
      ).revertedWithCustomError(lane.b.pool, 'InvalidSourcePoolAddress');
    });

    it('rejects an RMN-cursed source and permits retry after repair', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      await lane.b.rmn.setCursed(true);
      await expect(
        lane.b.pool
          .connect(offRamp)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      ).revertedWithCustomError(lane.b.pool, 'CursedByRMN');

      await lane.b.rmn.setCursed(false);
      await expect(
        lane.b.pool
          .connect(offRamp)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      ).not.reverted;
    });

    it('enforces inbound capacity, exhaustion, and timed refill', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      await setRateLimits(lane.b.pool, lane.a.selector, disabledRateLimiter, {
        isEnabled: true,
        capacity: 100,
        rate: 1,
      });
      const offRamp = await impersonate(lane.b.offRamp.address);
      await expect(
        lane.b.pool
          .connect(offRamp)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane, { sourceDenominatedAmount: 101 }),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      ).revertedWithCustomError(lane.b.pool, 'TokenMaxCapacityExceeded');

      await lane.b.pool
        .connect(offRamp)
        [RELEASE_OR_MINT_V2](
          buildReleaseOrMintInput(lane, { sourceDenominatedAmount: 100 }),
          CCIP_V2_WAIT_FOR_FINALITY,
        );
      await expect(
        lane.b.pool
          .connect(offRamp)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane, { sourceDenominatedAmount: 10 }),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      ).revertedWithCustomError(lane.b.pool, 'TokenRateLimitReached');

      await time.increase(10);
      await expect(
        lane.b.pool
          .connect(offRamp)
          [RELEASE_OR_MINT_V2](
            buildReleaseOrMintInput(lane, { sourceDenominatedAmount: 10 }),
            CCIP_V2_WAIT_FOR_FINALITY,
          ),
      ).not.reverted;
    });

    it('rejects malformed source decimals data before minting', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const offRamp = await impersonate(lane.b.offRamp.address);
      const malformedDecimalsData = [
        `0x${'00'.repeat(31)}`,
        `0x${'00'.repeat(33)}`,
        ethers.utils.defaultAbiCoder.encode(['uint256'], [256]),
      ];
      for (const sourcePoolData of malformedDecimalsData) {
        await expect(
          lane.b.pool
            .connect(offRamp)
            .callStatic[RELEASE_OR_MINT_V2](
              buildReleaseOrMintInput(lane, { sourcePoolData }),
              CCIP_V2_WAIT_FOR_FINALITY,
            ),
        ).reverted;
      }
    });

    it('rolls back when the inherited postflight hook rejects', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const hook = await deploy('CCIPV2AdvancedPoolHooksTester');
      await hook.setRejectPostflight(true);
      await lane.b.pool.updateAdvancedPoolHooks(hook.address);
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
      expect(await pendingRecoveryCount(lane.b.escrow)).eq(0);
    });

    it('emits only consistent standard mint and recovery events on fallback', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const amount = 1;
      await lane.accessControl.grantRole(
        await lane.b.token.BLACKLISTED_ROLE(),
        lane.bob.address,
      );
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        amount,
      );
      const execution = await executeV2(lane.b, outbound);
      expect(execution.state).eq(MessageExecutionState.SUCCESS);

      const releasedTopic =
        lane.b.pool.interface.getEventTopic('ReleasedOrMinted');
      const registeredTopic = ccipEscrow(
        lane.b.escrow.address,
        lane.owner,
      ).interface.getEventTopic('RecoveryRegistered');
      const fallbackHitTopic = ethers.utils.id(
        'FallbackHit(address,address,uint256,uint64,bool,bytes)',
      );
      expect(
        execution.receipt.logs.some((log) => log.topics[0] === releasedTopic),
      ).eq(true);
      expect(
        execution.receipt.logs.some((log) => log.topics[0] === registeredTopic),
      ).eq(true);
      expect(
        execution.receipt.logs.some(
          (log) => log.topics[0] === fallbackHitTopic,
        ),
      ).eq(false);
    });

    it('commits no mint or recovery event when fallback fails', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const blacklistRole = await lane.b.token.BLACKLISTED_ROLE();
      await lane.accessControl.grantRole(blacklistRole, lane.bob.address);
      await lane.accessControl.grantRole(blacklistRole, lane.b.escrow.address);
      const before = await destinationTokenSnapshot(lane);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      const execution = await executeV2(lane.b, outbound);
      expect(execution.state).eq(MessageExecutionState.FAILURE);
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);

      const failureTopic = ethers.utils.id(
        'FallbackFail(address,address,uint256,uint64,bytes)',
      );
      const registeredTopic = ccipEscrow(
        lane.b.escrow.address,
        lane.owner,
      ).interface.getEventTopic('RecoveryRegistered');
      expect(
        execution.receipt.logs.some((log) => log.topics[0] === failureTopic),
      ).eq(false);
      expect(
        execution.receipt.logs.some((log) => log.topics[0] === registeredTopic),
      ).eq(false);
    });

    it('manually executes the same failed message once after repair', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const blacklistRole = await lane.b.token.BLACKLISTED_ROLE();
      await lane.accessControl.grantRole(blacklistRole, lane.bob.address);
      await lane.accessControl.grantRole(blacklistRole, lane.b.escrow.address);
      const sourceSupplyAfterBurn = await lane.a.token.totalSupply();
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );

      await lane.accessControl.revokeRole(blacklistRole, lane.b.escrow.address);
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.a.token.totalSupply()).eq(sourceSupplyAfterBurn.sub(1));
      await expectFundedRecovery({
        escrow: lane.b.escrow,
        token: lane.b.token,
        recoveryId: await firstRecoveryId(lane, lane.bob.address, 1),
        originalSender: lane.alice.address,
        originalRecipient: lane.bob.address,
        sourceSelector: lane.a.selector,
        amount: 1,
      });
    });

    it('rejects replay after a successful execution', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        lane.bob.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      const before = await destinationTokenSnapshot(lane);
      await expect(
        lane.b.offRamp.execute(
          outbound.encodedMessage,
          outbound.ccvs,
          outbound.verifierResults,
          0,
          { gasLimit: 12_000_000 },
        ),
      ).revertedWithCustomError(
        lane.b.offRamp,
        'SkippedAlreadyExecutedMessage',
      );
      expect(await destinationTokenSnapshot(lane)).deep.eq(before);
    });

    it('rolls back token handling when a token-plus-data callback reverts', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const receiver = await deploy('CCIPV2MessageReceiverTester', true);
      await lane.accessControl.grantRole(
        lane.b.greenlistedRole,
        receiver.address,
      );
      const amount = 1;
      const message = {
        receiver: abiEncodedAddress(receiver.address),
        data: '0x1234',
        tokenAmounts: [{ token: lane.a.token.address, amount }],
        feeToken: constants.AddressZero,
        extraArgs: ethers.utils.solidityPack(
          ['bytes4', 'uint32', 'bytes4', 'bytes7'],
          [
            '0xa69dd4aa',
            200_000,
            CCIP_V2_WAIT_FOR_FINALITY,
            '0x00000000000000',
          ],
        ),
      };
      const before = await destinationTokenSnapshot(lane, [receiver.address]);
      const outbound = await sendPreparedV2(
        lane.a,
        lane.b,
        lane.alice,
        receiver.address,
        amount,
        message,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.FAILURE,
      );
      expect(await destinationTokenSnapshot(lane, [receiver.address])).deep.eq(
        before,
      );
      expect(await receiver.callbackCount()).eq(0);
    });

    it('skips a reverting contract callback for a token-only message', async () => {
      const lane = await loadFixture(ccipV2LaneFixture);
      const receiver = await deploy('CCIPV2MessageReceiverTester', true);
      await lane.accessControl.grantRole(
        lane.b.greenlistedRole,
        receiver.address,
      );
      const before = await lane.b.token.balanceOf(receiver.address);
      const outbound = await sendV2(
        lane.a,
        lane.b,
        lane.alice,
        receiver.address,
        1,
      );
      expect((await executeV2(lane.b, outbound)).state).eq(
        MessageExecutionState.SUCCESS,
      );
      expect(await lane.b.token.balanceOf(receiver.address)).eq(before.add(1));
      expect(await receiver.callbackCount()).eq(0);
    });
  });
});
