import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber, Contract, ContractTransaction } from 'ethers';
import hre, { ethers, network } from 'hardhat';
import { CallItem, Item } from 'hardhat-tracer';

import { createRequire } from 'module';

import {
  CCIP_V2_DEFAULT_TOKEN_GAS,
  CCIP_V2_EXPLICIT_TEST_TOKEN_GAS,
  CCIP_V2_WAIT_FOR_FINALITY,
  MessageExecutionState,
  abiEncodedAddress,
  buildTokenOnlyMessage,
  buildTokenTransferV1,
  ccipV2LaneFixture,
  executeV2,
  sendV2,
} from '../../common/ccip-v2.fixture';
import { ccipEscrow, ccipPoolFactory } from '../../common/ccip.helpers';

type Lane = Awaited<ReturnType<typeof ccipV2LaneFixture>>;

const loadModule = createRequire(__filename);

const disabledRateLimiter = { isEnabled: false, capacity: 0, rate: 0 };

const deploy = async (name: string, ...args: unknown[]) => {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract;
};

const measure = async (lane: Lane, recipient: string, amount = 1) => {
  const transfer = buildTokenTransferV1(lane.a, lane.b, recipient, amount);
  const originalSender = abiEncodedAddress(lane.alice.address);
  const segment = await lane.b.offRamp.callStatic.releaseOrMintAndMeasure(
    transfer,
    originalSender,
    lane.a.selector,
    CCIP_V2_WAIT_FOR_FINALITY,
  );
  const receipt = await (
    await lane.b.offRamp.releaseOrMintAndMeasure(
      transfer,
      originalSender,
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
    )
  ).wait();
  return {
    tokenHandlingGas: BigNumber.from(segment.gasUsed),
    receiverDelta: BigNumber.from(segment.receiverDelta),
    harnessTransactionGas: receipt.gasUsed,
  };
};

const report = (
  label: string,
  values: Record<string, BigNumber | number | string>,
) => {
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      BigNumber.isBigNumber(value) ? value.toString() : value,
    ]),
  );
  // Print named measurements so regressions are easy to compare across runs.
  console.log(`${label} ${JSON.stringify(normalized)}`);
};

const callOpcodes = new Set([
  'CALL',
  'STATICCALL',
  'DELEGATECALL',
  'CALLCODE',
  'CREATE',
  'CREATE2',
]);

const collectCalls = (call: CallItem): CallItem[] => [
  call,
  ...call.children.flatMap((child) =>
    callOpcodes.has(child.opcode) ? collectCalls(child as CallItem) : [],
  ),
];

const traceTransaction = async (
  send: () => Promise<ContractTransaction>,
): Promise<CallItem[]> => {
  if (!hre.tracer.switch)
    throw new Error('Hardhat tracer switch is not initialized');
  hre.tracer.opcodes.set('SSTORE', true);
  await hre.tracer.switch.enable();
  hre.tracer.enabled = true;
  try {
    const transaction = await send();
    await transaction.wait();
    const trace = hre.tracer.lastTrace();
    if (!trace?.top) throw new Error('Hardhat tracer did not record the call');
    return collectCalls(trace.top);
  } finally {
    hre.tracer.enabled = false;
    await hre.tracer.switch.disable();
  }
};

const callsTo = (calls: CallItem[], target: string, selector: string) =>
  calls.filter(
    (call) =>
      call.params.to?.toLowerCase() === target.toLowerCase() &&
      call.params.inputData.slice(0, 10).toLowerCase() ===
        selector.toLowerCase(),
  );

const measuredCallGas = (call: CallItem) => {
  if (call.params.gasUsed === undefined)
    throw new Error('Hardhat tracer call has no gas measurement');
  return call.params.gasUsed;
};

const storageWriteItems = (call: CallItem): Item<unknown>[] =>
  call.children.flatMap((child: Item<unknown>) =>
    child.opcode === 'SSTORE'
      ? [child]
      : callOpcodes.has(child.opcode)
      ? storageWriteItems(child as CallItem)
      : [],
  );

const destinationSnapshot = async (lane: Lane) => ({
  bob: (await lane.b.token.balanceOf(lane.bob.address)).toString(),
  escrow: (await lane.b.token.balanceOf(lane.b.escrow.address)).toString(),
  supply: (await lane.b.token.totalSupply()).toString(),
});

const tokenSegmentWithBudget = async (
  lane: Lane,
  recipient: string,
  gasBudget: number,
) => {
  const transfer = buildTokenTransferV1(lane.a, lane.b, recipient, 1);
  const args = [
    transfer,
    abiEncodedAddress(lane.alice.address),
    lane.a.selector,
    CCIP_V2_WAIT_FOR_FINALITY,
    gasBudget,
  ] as const;
  const simulated = await lane.b.offRamp.callStatic.releaseOrMintWithGasBudget(
    ...args,
  );
  await (await lane.b.offRamp.releaseOrMintWithGasBudget(...args)).wait();
  return simulated as {
    success: boolean;
    gasUsed: BigNumber;
    receiverDelta: BigNumber;
    error: string;
  };
};

const setDefaultTokenGas = async (lane: Lane, gas: number) => {
  const [selectors, configs] = await lane.a.feeQuoter.getAllDestChainConfigs();
  const index = selectors.findIndex((selector: BigNumber) =>
    selector.eq(lane.b.selector),
  );
  if (index === -1) throw new Error('Destination FeeQuoter config not found');
  const current = configs[index];
  await lane.a.feeQuoter.applyDestChainConfigUpdates([
    {
      destChainSelector: lane.b.selector,
      destChainConfig: {
        isEnabled: current.isEnabled,
        maxDataBytes: current.maxDataBytes,
        maxPerMsgGasLimit: current.maxPerMsgGasLimit,
        destGasOverhead: current.destGasOverhead,
        destGasPerPayloadByteBase: current.destGasPerPayloadByteBase,
        chainFamilySelector: current.chainFamilySelector,
        defaultTokenFeeUSDCents: current.defaultTokenFeeUSDCents,
        defaultTokenDestGasOverhead: gas,
        defaultTxGasLimit: current.defaultTxGasLimit,
        networkFeeUSDCents: current.networkFeeUSDCents,
        linkFeeMultiplierPercent: current.linkFeeMultiplierPercent,
      },
    },
  ]);
};

describe('Midas CCIP measured gas boundaries', () => {
  it('measures eligible direct mint through the exact token segment', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const result = await measure(lane, lane.carol.address);
    report('eligible direct mint', result);
    expect(result.tokenHandlingGas).gt(0);
    expect(result.receiverDelta).eq(1);
  });

  it('measures a blacklisted recipient through the funded escrow fallback', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const result = await measure(lane, lane.bob.address);
    report('blacklisted recipient fallback', result);
    expect(result.tokenHandlingGas).gt(0);
    expect(result.receiverDelta).eq(0);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(1);
  });

  it('measures a non-greenlisted recipient as a separate fallback policy path', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.revokeRole(
      lane.b.greenlistedRole,
      lane.bob.address,
    );
    const result = await measure(lane, lane.bob.address);
    report('non-greenlisted recipient fallback', result);
    expect(result.tokenHandlingGas).gt(0);
    expect(result.receiverDelta).eq(0);
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(1);
  });

  it('measures the token segment after the same pool preflight used by V2 execution', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const directTransfer = buildTokenTransferV1(
      lane.a,
      lane.b,
      lane.carol.address,
      1,
    );
    const fallbackTransfer = buildTokenTransferV1(
      lane.a,
      lane.b,
      lane.bob.address,
      1,
    );
    const nonGreenlistedTransfer = buildTokenTransferV1(
      lane.a,
      lane.b,
      lane.unlisted.address,
      1,
    );
    const originalSender = abiEncodedAddress(lane.alice.address);

    const coldDirect = await lane.b.offRamp.callStatic.releaseOrMintAndMeasure(
      directTransfer,
      originalSender,
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
    );
    const warmedDirect =
      await lane.b.offRamp.callStatic.releaseOrMintAfterPoolPreflightAndMeasure(
        directTransfer,
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
    const coldFallback =
      await lane.b.offRamp.callStatic.releaseOrMintAndMeasure(
        fallbackTransfer,
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
    const warmedFallback =
      await lane.b.offRamp.callStatic.releaseOrMintAfterPoolPreflightAndMeasure(
        fallbackTransfer,
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
    const coldNonGreenlisted =
      await lane.b.offRamp.callStatic.releaseOrMintAndMeasure(
        nonGreenlistedTransfer,
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
    const warmedNonGreenlisted =
      await lane.b.offRamp.callStatic.releaseOrMintAfterPoolPreflightAndMeasure(
        nonGreenlistedTransfer,
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
    const boundedFallback =
      await lane.b.offRamp.callStatic.releaseOrMintWithGasBudget(
        fallbackTransfer,
        originalSender,
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
        CCIP_V2_EXPLICIT_TEST_TOKEN_GAS,
      );

    report('pool preflight comparison', {
      coldDirectGas: coldDirect.gasUsed,
      preflightWarmedDirectGas: warmedDirect.gasUsed,
      coldFirstFallbackGas: coldFallback.gasUsed,
      preflightWarmedFirstFallbackGas: warmedFallback.gasUsed,
      coldNonGreenlistedFallbackGas: coldNonGreenlisted.gasUsed,
      preflightWarmedNonGreenlistedFallbackGas: warmedNonGreenlisted.gasUsed,
    });
    expect(warmedDirect.receiverDelta).eq(1);
    expect(warmedFallback.receiverDelta).eq(0);
    expect(warmedNonGreenlisted.receiverDelta).eq(0);
    expect(warmedDirect.gasUsed).lte(coldDirect.gasUsed);
    expect(warmedFallback.gasUsed).lte(coldFallback.gasUsed);
    expect(warmedNonGreenlisted.gasUsed).lte(coldNonGreenlisted.gasUsed);
    expect(boundedFallback.success).eq(true);
    expect(boundedFallback.gasUsed).eq(warmedFallback.gasUsed);

    await lane.b.offRamp.releaseOrMintAfterPoolPreflightAndMeasure(
      fallbackTransfer,
      originalSender,
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
    );
    expect(await lane.b.token.balanceOf(lane.b.escrow.address)).eq(1);
  });

  it('attributes first-recovery gas and proves later registrations reuse counter storage', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const transfer = buildTokenTransferV1(lane.a, lane.b, lane.bob.address, 1);
    const args = [
      transfer,
      abiEncodedAddress(lane.alice.address),
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
    ] as const;
    const releaseOrMintSelector = lane.b.pool.interface.getSighash(
      'releaseOrMint((bytes,uint64,address,uint256,address,bytes,bytes,bytes),bytes4)',
    );
    const mintSelector = lane.b.token.interface.getSighash(
      'mint(address,uint256)',
    );
    const callbackSelector = lane.b.escrow.interface.getSighash(
      'onFallbackMinted(address,address,uint64,uint256)',
    );

    const measureRegistration = async () => {
      const segment =
        await lane.b.offRamp.callStatic.releaseOrMintAfterPoolPreflightAndMeasure(
          ...args,
        );
      const calls = await traceTransaction(() =>
        lane.b.offRamp.releaseOrMintAfterPoolPreflightAndMeasure(...args, {
          gasLimit: 1_000_000,
        }),
      );
      const poolCalls = callsTo(
        calls,
        lane.b.pool.address,
        releaseOrMintSelector,
      );
      const mintCalls = callsTo(calls, lane.b.token.address, mintSelector);
      const callbackCalls = callsTo(
        calls,
        lane.b.escrow.address,
        callbackSelector,
      );

      expect(poolCalls).length(1);
      expect(mintCalls).length(2);
      expect(mintCalls[0].params.success).eq(false);
      expect(mintCalls[1].params.success).eq(true);
      expect(callbackCalls).length(1);
      expect(callbackCalls[0].params.success).eq(true);

      const callbackStorage = storageWriteItems(callbackCalls[0]);
      const uniqueStorageSlots = new Set(
        callbackStorage.map((item) => String(item.params.key)),
      );
      const nonzeroStorageSlots = new Set(
        callbackStorage
          .filter(
            (item) => String(item.params.value) !== ethers.constants.HashZero,
          )
          .map((item) => String(item.params.key)),
      );

      return {
        segmentGas: BigNumber.from(segment.gasUsed),
        poolGas: measuredCallGas(poolCalls[0]),
        failedMintGas: measuredCallGas(mintCalls[0]),
        fallbackMintGas: measuredCallGas(mintCalls[1]),
        callbackGas: measuredCallGas(callbackCalls[0]),
        callbackStorageWrites: callbackStorage.length,
        callbackUniqueStorageSlots: uniqueStorageSlots.size,
        callbackNonzeroStorageSlots: nonzeroStorageSlots.size,
      };
    };

    const first = await measureRegistration();
    const second = await measureRegistration();

    report('first escrow recovery', first);
    report('subsequent escrow recovery', second);
    expect(first.callbackNonzeroStorageSlots).eq(7);
    expect(second.callbackNonzeroStorageSlots).eq(7);
    expect(second.callbackGas).lt(first.callbackGas);
    expect(second.segmentGas).lt(first.segmentGas);
    expect(await lane.b.escrow.pendingCount()).eq(2);
    expect(await lane.b.escrow.totalReserved()).eq(2);
  });

  it('proves primary-plus-fallback failure is atomic', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const blacklistRole = await lane.b.token.BLACKLISTED_ROLE();
    await lane.accessControl.grantRole(blacklistRole, lane.bob.address);
    await lane.accessControl.grantRole(blacklistRole, lane.b.escrow.address);
    const before = await destinationSnapshot(lane);
    await expect(
      lane.b.offRamp.releaseOrMintAndMeasure(
        buildTokenTransferV1(lane.a, lane.b, lane.bob.address, 1),
        abiEncodedAddress(lane.alice.address),
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      ),
    ).revertedWithCustomError(lane.b.offRamp, 'TokenHandlingError');
    expect(await destinationSnapshot(lane)).deep.eq(before);
  });

  it('proves a rejecting registration callback rolls fallback mint back', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const factory = await ccipPoolFactory(lane.owner);
    const poolDeployment = await factory.deploy(
      lane.b.token.address,
      lane.b.rmn.address,
      lane.b.router.address,
    );
    await poolDeployment.deployed();
    const pool = (
      await ethers.getContractFactory('MidasCCTBurnMintTokenPool')
    ).attach(poolDeployment.address);
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
    const fallback = await deploy(
      'CCIPV2FallbackReceiverTester',
      pool.address,
      true,
    );
    await lane.accessControl.grantRole(
      lane.b.greenlistedRole,
      fallback.address,
    );
    await new Contract(
      pool.address,
      ['function setFallbackReceiver(address)'],
      lane.owner,
    ).setFallbackReceiver(fallback.address);
    await lane.b.registry.setPool(lane.b.token.address, pool.address);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const before = await destinationSnapshot(lane);
    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      1,
    );
    await lane.b.offRamp.execute(
      outbound.encodedMessage,
      outbound.ccvs,
      outbound.verifierResults,
      0,
      { gasLimit: 12_000_000 },
    );
    expect(await lane.b.offRamp.getExecutionState(outbound.messageId)).eq(3);
    expect(await destinationSnapshot(lane)).deep.eq(before);
  });

  it('measures return dispatch with exact fee and refund', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    const escrow = ccipEscrow(lane.b.escrow.address, lane.owner);
    await lane.b.token.mint(lane.b.escrow.address, 2);
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [lane.b.pool.address],
    });
    await networkFund(lane.b.pool.address);
    const poolSigner = await ethers.getSigner(lane.b.pool.address);
    await ccipEscrow(lane.b.escrow.address, poolSigner).onFallbackMinted(
      lane.alice.address,
      lane.bob.address,
      lane.a.selector,
      2,
    );
    const recoveryId = await recoveryIdAt(escrow, 0);
    const fee = await escrow.getReturnToSourceFee(recoveryId);
    const exact = await (
      await escrow.returnToSource(recoveryId, { value: fee })
    ).wait();
    report('return dispatch with exact fee', {
      transactionGas: exact.gasUsed,
      fee,
    });

    await lane.b.token.mint(lane.b.escrow.address, 2);
    await ccipEscrow(lane.b.escrow.address, poolSigner).onFallbackMinted(
      lane.alice.address,
      lane.bob.address,
      lane.a.selector,
      2,
    );
    const secondId = await recoveryIdAt(escrow, 1);
    const secondFee = await escrow.getReturnToSourceFee(secondId);
    const refunded = await (
      await escrow.returnToSource(secondId, { value: secondFee.add(1) })
    ).wait();
    report('return dispatch with refund', {
      transactionGas: refunded.gasUsed,
      fee: secondFee,
      excess: 1,
    });
  });

  it('models the published 90k service boundary against the preflight-warmed fallback', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const transfer = buildTokenTransferV1(lane.a, lane.b, lane.bob.address, 1);
    const result =
      await lane.b.offRamp.callStatic.releaseOrMintAfterPoolPreflightAndMeasure(
        transfer,
        abiEncodedAddress(lane.alice.address),
        lane.a.selector,
        CCIP_V2_WAIT_FOR_FINALITY,
      );
    report('token handling budget', {
      preflightWarmedTokenHandlingGas: result.gasUsed,
      defaultBudget: CCIP_V2_DEFAULT_TOKEN_GAS,
      explicitTestBudget: CCIP_V2_EXPLICIT_TEST_TOKEN_GAS,
    });
    expect(result.gasUsed).gt(CCIP_V2_DEFAULT_TOKEN_GAS);
    expect(result.gasUsed).lte(CCIP_V2_EXPLICIT_TEST_TOKEN_GAS);

    const explicit = await tokenSegmentWithBudget(
      lane,
      lane.bob.address,
      CCIP_V2_EXPLICIT_TEST_TOKEN_GAS,
    );
    expect(explicit.success).eq(true);
    expect(explicit.gasUsed).eq(result.gasUsed);
  });

  it('models the published 90k token-pool limit and rolls the fallback back atomically', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const before = await destinationSnapshot(lane);

    const result = await tokenSegmentWithBudget(
      lane,
      lane.bob.address,
      CCIP_V2_DEFAULT_TOKEN_GAS,
    );

    expect(result.success).eq(false);
    expect(await destinationSnapshot(lane)).deep.eq(before);
  });

  it('propagates a higher test receipt and separately verifies its modeled token budget', async () => {
    const lane = await loadFixture(ccipV2LaneFixture);
    await lane.accessControl.grantRole(
      await lane.b.token.BLACKLISTED_ROLE(),
      lane.bob.address,
    );
    const message = buildTokenOnlyMessage(
      lane.a.token.address,
      1,
      lane.bob.address,
    );
    const configuredBudget = CCIP_V2_EXPLICIT_TEST_TOKEN_GAS;
    await setDefaultTokenGas(lane, configuredBudget);
    const configuredFee = await lane.a.router.getFee(lane.b.selector, message);

    const outbound = await sendV2(
      lane.a,
      lane.b,
      lane.alice,
      lane.bob.address,
      1,
    );
    const poolReceipt = outbound.receipts[outbound.verifierResults.length];
    expect(poolReceipt.destGasLimit).eq(configuredBudget);
    expect(outbound.fee).eq(configuredFee);

    const result = await lane.b.offRamp.callStatic.releaseOrMintWithGasBudget(
      buildTokenTransferV1(lane.a, lane.b, lane.bob.address, 1),
      abiEncodedAddress(lane.alice.address),
      lane.a.selector,
      CCIP_V2_WAIT_FOR_FINALITY,
      configuredBudget,
    );
    expect(result.success).eq(true);

    // The local OffRamp helper uses a deliberately independent 12m outer
    // transaction limit. This assertion proves end-to-end behavior, not that
    // the receipt itself enforces or guarantees a live executor allowance.
    expect((await executeV2(lane.b, outbound)).state).eq(
      MessageExecutionState.SUCCESS,
    );
  });

  it('includes nested CCIP tests in the configured coverage command', async () => {
    const packageJson = loadModule('../../../package.json') as {
      scripts: { coverage: string };
    };
    expect(packageJson.scripts.coverage).matches(
      /test\/unit\/\*\*\/\*\.test\.ts/,
    );
  });
});

const networkFund = async (account: string) => {
  await ethers.provider.send('hardhat_setBalance', [
    account,
    '0x56BC75E2D63100000',
  ]);
};

const recoveryIdAt = async (escrow: Contract, nonce: number) => {
  const transaction = await escrow.queryFilter(
    escrow.filters.RecoveryRegistered(),
  );
  const event = transaction[nonce];
  if (!event?.args?.recoveryId) throw new Error('Recovery event not found');
  return event.args.recoveryId as string;
};
