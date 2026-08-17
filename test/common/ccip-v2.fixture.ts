import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, BigNumberish, Contract, ContractReceipt } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { deployProxyContract } from './deploy.helpers';
import { defaultDeploy } from './fixtures';

export const CCIP_V2_SOURCE_SELECTOR = BigNumber.from('16015286601757825753');
export const CCIP_V2_DEST_SELECTOR = BigNumber.from('5009297550715157269');
export const CCIP_V2_WAIT_FOR_FINALITY = '0x00000000';
export const CCIP_V2_EVM_CHAIN_FAMILY = '0x2812d52c';
export const CCIP_V2_DEFAULT_TOKEN_GAS = 90_000;
// Test-only proof that V2 receipts propagate a budget above the public default.
// This is not evidence that any production lane has approved this value.
export const CCIP_V2_EXPLICIT_TEST_TOKEN_GAS = 400_000;
export const CCIP_V2_SOURCE_TOKEN_DATA_BYTES = 32;
export const CCIP_V2_BASIC_EXTRA_ARGS = ethers.utils.solidityPack(
  ['bytes4', 'uint32', 'bytes4', 'bytes7'],
  ['0xa69dd4aa', 0, CCIP_V2_WAIT_FOR_FINALITY, '0x00000000000000'],
);

export const MessageExecutionState = {
  UNTOUCHED: 0,
  IN_PROGRESS: 1,
  SUCCESS: 2,
  FAILURE: 3,
} as const;

export type CcipV2Side = {
  selector: BigNumber;
  token: Contract;
  pool: Contract;
  escrow: Contract;
  rmn: Contract;
  wrappedNative: Contract;
  registry: Contract;
  feeQuoter: Contract;
  router: Contract;
  onRamp: Contract;
  offRamp: Contract;
  greenlistedRole: string;
  minterRole: string;
  burnerRole: string;
};

export type BidirectionalV2Fixture = Awaited<
  ReturnType<typeof ccipV2LaneFixture>
>;

export type OutboundV2Message = {
  source: CcipV2Side;
  destination: CcipV2Side;
  sender: SignerWithAddress;
  recipient: string;
  amount: BigNumber;
  fee: BigNumber;
  message: PreparedV2Message;
  messageId: string;
  encodedMessage: string;
  ccvs: string[];
  verifierResults: string[];
  receipts: Array<{
    issuer: string;
    destGasLimit: BigNumber;
    destBytesOverhead: BigNumber;
    feeTokenAmount: BigNumber;
    extraArgs: string;
  }>;
  sourceReceipt: ContractReceipt;
};

export type PreparedV2Message = {
  receiver: string;
  data: string;
  tokenAmounts: Array<{ token: string; amount: BigNumberish }>;
  feeToken: string;
  extraArgs: string;
};

type SideCoreParams = {
  selector: BigNumber;
  remoteSelector: BigNumber;
  owner: SignerWithAddress;
  accessControl: Contract;
  defaultRecipient: SignerWithAddress;
};

const disabledRateLimiter = {
  isEnabled: false,
  capacity: 0,
  rate: 0,
};

const rawAddress = (address: string) =>
  ethers.utils.solidityPack(['address'], [address]);

export const abiEncodedAddress = (address: string) =>
  ethers.utils.defaultAbiCoder.encode(['address'], [address]);

export const encodedLocalDecimals = () =>
  ethers.utils.defaultAbiCoder.encode(['uint256'], [18]);

const deployContract = async (name: string, ...args: unknown[]) => {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract;
};

const deployPool = async (
  token: Contract,
  rmn: Contract,
  router: Contract,
  temporaryFallback: string,
) => {
  const factory = await ethers.getContractFactory('MidasCCTBurnMintTokenPool');
  const constructorInputs = factory.interface.deploy.inputs.length;

  if (constructorInputs === 4) {
    return deployContract(
      'MidasCCTBurnMintTokenPool',
      token.address,
      rmn.address,
      router.address,
      temporaryFallback,
    );
  }

  if (constructorInputs === 3) {
    return deployContract(
      'MidasCCTBurnMintTokenPool',
      token.address,
      rmn.address,
      router.address,
    );
  }

  throw new Error(
    `Unsupported MidasCCTBurnMintTokenPool constructor with ${constructorInputs} inputs`,
  );
};

const deploySideCore = async ({
  selector,
  remoteSelector,
  owner,
  accessControl,
  defaultRecipient,
}: SideCoreParams): Promise<CcipV2Side> => {
  const rmn = await deployContract('CCIPRmnMock');
  const wrappedNative = await deployContract('WETH9');
  const registry = await deployContract('TokenAdminRegistry');
  const router = await deployContract(
    'Router',
    wrappedNative.address,
    rmn.address,
  );

  const feeQuoter = await deployContract(
    'FeeQuoterHelper',
    {
      maxFeeJuelsPerMsg: BigNumber.from(2).pow(96).sub(1),
      linkToken: wrappedNative.address,
    },
    [owner.address],
    [],
    [
      {
        destChainSelector: remoteSelector,
        destChainConfig: {
          isEnabled: true,
          maxDataBytes: 30_000,
          maxPerMsgGasLimit: 4_000_000,
          destGasOverhead: 0,
          destGasPerPayloadByteBase: 1,
          chainFamilySelector: CCIP_V2_EVM_CHAIN_FAMILY,
          defaultTokenFeeUSDCents: 0,
          defaultTokenDestGasOverhead: CCIP_V2_DEFAULT_TOKEN_GAS,
          defaultTxGasLimit: 200_000,
          networkFeeUSDCents: 0,
          linkFeeMultiplierPercent: 100,
        },
      },
    ],
  );

  await feeQuoter.updatePrices({
    tokenPriceUpdates: [
      {
        sourceToken: wrappedNative.address,
        usdPerToken: parseUnits('3000', 18),
      },
    ],
    gasPriceUpdates: [
      {
        destChainSelector: remoteSelector,
        usdPerUnitGas: BigNumber.from(1_000_000_000),
      },
    ],
  });

  const onRamp = await deployContract(
    'OnRampHelper',
    {
      chainSelector: selector,
      rmnRemote: rmn.address,
      maxUSDCentsPerMessage: 1_000_000,
      tokenAdminRegistry: registry.address,
    },
    {
      feeQuoter: feeQuoter.address,
      reentrancyGuardEntered: false,
      feeAggregator: owner.address,
    },
  );

  const offRamp = await deployContract('CCIPV2GasOffRampHarness', {
    localChainSelector: selector,
    gasForCallExactCheck: 5_000,
    rmnRemote: rmn.address,
    tokenAdminRegistry: registry.address,
    maxGasBufferToUpdateState: 100_000,
  });

  const token = await deployContract('mTokenPermissionedTest');
  await token.initialize(accessControl.address);

  const pool = await deployPool(
    token,
    rmn,
    router,
    temporaryFallbackAddress(defaultRecipient),
  );

  const escrow = await deployProxyContract('MidasCCTFallbackEscrow', [
    accessControl.address,
    pool.address,
    defaultRecipient.address,
  ]);
  await pool.setFallbackReceiver(escrow.address);

  await registry.proposeAdministrator(token.address, owner.address);
  await registry.acceptAdminRole(token.address);
  await registry.setPool(token.address, pool.address);

  const greenlistedRole = await token.M_TOKEN_TEST_GREENLISTED_ROLE();
  const minterRole = await token.M_TOKEN_TEST_MINT_OPERATOR_ROLE();
  const burnerRole = await token.M_TOKEN_TEST_BURN_OPERATOR_ROLE();

  await accessControl.grantRole(minterRole, owner.address);
  await accessControl.grantRole(minterRole, pool.address);
  await accessControl.grantRole(burnerRole, pool.address);
  await accessControl.grantRole(
    await escrow.FALLBACK_ESCROW_ADMIN_ROLE(),
    owner.address,
  );

  return {
    selector,
    token,
    pool,
    escrow,
    rmn,
    wrappedNative,
    registry,
    feeQuoter,
    router,
    onRamp,
    offRamp,
    greenlistedRole,
    minterRole,
    burnerRole,
  };
};

const temporaryFallbackAddress = (recipient: SignerWithAddress) =>
  recipient.address;

const configureDirection = async (
  source: CcipV2Side,
  destination: CcipV2Side,
  verifier: Contract,
  executor: Contract,
) => {
  await source.pool.applyChainUpdates(
    [],
    [
      {
        remoteChainSelector: destination.selector,
        remotePoolAddresses: [abiEncodedAddress(destination.pool.address)],
        remoteTokenAddress: abiEncodedAddress(destination.token.address),
        outboundRateLimiterConfig: disabledRateLimiter,
        inboundRateLimiterConfig: disabledRateLimiter,
      },
    ],
  );

  await source.onRamp.applyDestChainConfigUpdates([
    {
      destChainSelector: destination.selector,
      router: source.router.address,
      addressBytesLength: 20,
      tokenReceiverAllowed: false,
      messageNetworkFeeUSDCents: 0,
      tokenNetworkFeeUSDCents: 0,
      baseExecutionGasCost: 100_000,
      defaultCCVs: [verifier.address],
      laneMandatedCCVs: [],
      defaultExecutor: executor.address,
      offRamp: rawAddress(destination.offRamp.address),
    },
  ]);

  await destination.offRamp.applySourceChainConfigUpdates([
    {
      router: destination.router.address,
      sourceChainSelector: source.selector,
      isEnabled: true,
      onRamps: [abiEncodedAddress(source.onRamp.address)],
      defaultCCVs: [verifier.address],
      laneMandatedCCVs: [],
    },
  ]);

  await source.router.applyRampUpdates(
    [
      {
        destChainSelector: destination.selector,
        onRamp: source.onRamp.address,
      },
    ],
    [],
    [],
  );

  await destination.router.applyRampUpdates(
    [],
    [],
    [
      {
        sourceChainSelector: source.selector,
        offRamp: destination.offRamp.address,
      },
    ],
  );
};

export const ccipV2LaneFixture = async () => {
  const base = await defaultDeploy();
  const { owner, accessControl, regularAccounts } = base;
  const [alice, bob, carol, defaultRecipient, unlisted] = regularAccounts;

  const verifier = await deployContract('MockVerifier', '0x1234');
  const executor = await deployContract('MockExecutor');

  const a = await deploySideCore({
    selector: CCIP_V2_SOURCE_SELECTOR,
    remoteSelector: CCIP_V2_DEST_SELECTOR,
    owner,
    accessControl,
    defaultRecipient,
  });
  const b = await deploySideCore({
    selector: CCIP_V2_DEST_SELECTOR,
    remoteSelector: CCIP_V2_SOURCE_SELECTOR,
    owner,
    accessControl,
    defaultRecipient,
  });

  await configureDirection(a, b, verifier, executor);
  await configureDirection(b, a, verifier, executor);

  const eligible = [
    owner.address,
    alice.address,
    bob.address,
    carol.address,
    defaultRecipient.address,
  ];
  for (const side of [a, b]) {
    for (const account of [
      ...eligible,
      side.pool.address,
      side.escrow.address,
    ]) {
      await accessControl.grantRole(side.greenlistedRole, account);
    }
  }

  const initialBalance = parseUnits('1000000', 18);
  await a.token.mint(alice.address, initialBalance);
  await a.token.mint(bob.address, initialBalance);
  await b.token.mint(alice.address, initialBalance);
  await b.token.mint(bob.address, initialBalance);

  return {
    ...base,
    a,
    b,
    verifier,
    executor,
    alice,
    bob,
    carol,
    unlisted,
    defaultRecipient,
    initialBalance,
  };
};

export const buildTokenOnlyMessage = (
  token: string,
  amount: BigNumberish,
  recipient: string,
) => ({
  receiver: abiEncodedAddress(recipient),
  data: '0x',
  tokenAmounts: [{ token, amount }],
  feeToken: ethers.constants.AddressZero,
  extraArgs: CCIP_V2_BASIC_EXTRA_ARGS,
});

const parseContractEvent = (
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
  if (!log) {
    throw new Error(`${eventName} was not emitted by ${contract.address}`);
  }
  return contract.interface.parseLog(log);
};

export const sendV2 = async (
  source: CcipV2Side,
  destination: CcipV2Side,
  sender: SignerWithAddress,
  recipient: string,
  amountInput: BigNumberish,
): Promise<OutboundV2Message> => {
  const amount = BigNumber.from(amountInput);
  const message = buildTokenOnlyMessage(
    source.token.address,
    amount,
    recipient,
  );

  return sendPreparedV2(
    source,
    destination,
    sender,
    recipient,
    amount,
    message,
  );
};

export const sendPreparedV2 = async (
  source: CcipV2Side,
  destination: CcipV2Side,
  sender: SignerWithAddress,
  recipient: string,
  amountInput: BigNumberish,
  message: PreparedV2Message,
): Promise<OutboundV2Message> => {
  const amount = BigNumber.from(amountInput);

  await source.token.connect(sender).approve(source.router.address, amount);
  const fee = await source.router.getFee(destination.selector, message);
  const transaction = await source.router
    .connect(sender)
    .ccipSend(destination.selector, message, { value: fee });
  const sourceReceipt = await transaction.wait();
  const sentEvent = parseContractEvent(
    sourceReceipt,
    source.onRamp,
    'CCIPMessageSent',
  );
  const encodedMessage = sentEvent.args.encodedMessage as string;
  const messageId = sentEvent.args.messageId as string;
  const verifierResults = [...sentEvent.args.verifierBlobs] as string[];
  const receipts = [
    ...sentEvent.args.receipts,
  ] as OutboundV2Message['receipts'];
  const ccvs = receipts
    .slice(0, verifierResults.length)
    .map((receipt) => receipt.issuer);

  if (ethers.utils.keccak256(encodedMessage) !== messageId) {
    throw new Error('OnRamp message id does not hash the emitted message');
  }

  return {
    source,
    destination,
    sender,
    recipient,
    amount,
    fee,
    message,
    messageId,
    encodedMessage,
    ccvs,
    verifierResults,
    receipts,
    sourceReceipt,
  };
};

export const executeV2 = async (
  destination: CcipV2Side,
  outbound: OutboundV2Message,
  gasLimitOverride = 0,
) => {
  const transaction = await destination.offRamp.execute(
    outbound.encodedMessage,
    outbound.ccvs,
    outbound.verifierResults,
    gasLimitOverride,
    { gasLimit: 12_000_000 },
  );
  const receipt = await transaction.wait();
  const event = parseContractEvent(
    receipt,
    destination.offRamp,
    'ExecutionStateChanged',
  );
  const state = Number(
    await destination.offRamp.getExecutionState(outbound.messageId),
  );

  return { transaction, receipt, event, state };
};

export const buildTokenTransferV1 = (
  source: CcipV2Side,
  destination: CcipV2Side,
  recipient: string,
  amount: BigNumberish,
) => ({
  amount,
  sourcePoolAddress: abiEncodedAddress(source.pool.address),
  sourceTokenAddress: abiEncodedAddress(source.token.address),
  destTokenAddress: rawAddress(destination.token.address),
  tokenReceiver: rawAddress(recipient),
  extraData: encodedLocalDecimals(),
});
