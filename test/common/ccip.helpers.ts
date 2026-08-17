import { expect } from 'chai';
import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractFactory,
  Signer,
  constants,
} from 'ethers';
import { artifacts, ethers } from 'hardhat';

import { CCIP_V2_BASIC_EXTRA_ARGS } from './ccip-v2.fixture';

export const RecoveryStatus = {
  None: 0,
  Pending: 1,
  Claimed: 2,
  AdminRecovered: 3,
  ReturnDispatched: 4,
  Confiscated: 5,
} as const;

export const CCIP_POOL_ABI = [
  'constructor(address token,address rmnProxy,address router)',
  'function fallbackReceiver() view returns (address)',
  'function setFallbackReceiver(address newFallbackReceiver)',
  'function releaseOrMint((bytes originalSender,uint64 remoteChainSelector,address receiver,uint256 sourceDenominatedAmount,address localToken,bytes sourcePoolAddress,bytes sourcePoolData,bytes offchainTokenData),bytes4 requestedFinalityConfig) returns (uint256 destinationAmount)',
  'event FallbackReceiverSet(address indexed oldFallbackReceiver,address indexed newFallbackReceiver)',
  'error InvalidFallbackReceiver(address newFallbackReceiver)',
  'error FallbackReceiverAlreadyConfigured(address fallbackReceiver)',
  'error FallbackReceiverNotConfigured()',
  'error InvalidOriginalSender(bytes originalSender)',
];

export const CCIP_ESCROW_ABI = [
  'function initialize(address accessControl,address tokenPool,address defaultRecipient)',
  'function accessControl() view returns (address)',
  'function tokenPool() view returns (address)',
  'function token() view returns (address)',
  'function defaultRecipient() view returns (address)',
  'function recoveryCount() view returns (uint256)',
  'function pendingCount() view returns (uint256)',
  'function totalReserved() view returns (uint256)',
  'function recoveries(bytes32 recoveryId) view returns (address originalSender,address originalRecipient,uint64 originalSourceChainSelector,uint256 amount,uint8 status,bool returnable,bytes32 outboundCcipMessageId)',
  'function isPeerEscrow(uint64 sourceChainSelector,address peerEscrow) view returns (bool)',
  'function FALLBACK_ESCROW_ADMIN_ROLE() view returns (bytes32)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function onFallbackMinted(address originalSender,address originalRecipient,uint64 originalSourceChainSelector,uint256 amount)',
  'function claim(bytes32 recoveryId,address recipient)',
  'function adminRecoverBulk((bytes32 recoveryId,address recipient)[] recoveries)',
  'function confiscateBulk(bytes32[] recoveryIds)',
  'function getReturnToSourceFee(bytes32 recoveryId) view returns (uint256)',
  'function returnToSource(bytes32 recoveryId) payable returns (bytes32 outboundCcipMessageId)',
  'function setDefaultRecipient(address newDefaultRecipient)',
  'function setPeerEscrow(uint64 sourceChainSelector,address peerEscrow,bool allowed)',
  'event RecoveryRegistered(bytes32 indexed recoveryId,address indexed originalSender,address indexed originalRecipient,uint64 originalSourceChainSelector,uint256 amount,bool returnable)',
  'event RecoveryClaimed(bytes32 indexed recoveryId,address indexed originalRecipient,address indexed recipient,uint256 amount)',
  'event RecoveryAdminRecovered(bytes32 indexed recoveryId,address indexed admin,address indexed recipient,address originalRecipient,uint256 amount)',
  'event RecoveryReturnDispatched(bytes32 indexed recoveryId,bytes32 indexed outboundCcipMessageId,address indexed caller,uint64 originalSourceChainSelector,address originalSender,uint256 amount)',
  'event RecoveryConfiscated(bytes32 indexed recoveryId,address indexed admin,address indexed defaultRecipient,uint256 amount)',
  'event DefaultRecipientSet(address indexed oldDefaultRecipient,address indexed newDefaultRecipient)',
  'event PeerEscrowSet(uint64 indexed sourceChainSelector,address indexed peerEscrow,bool allowed)',
  'error NotTokenPool(address caller)',
  'error NotEscrowAdmin(address caller)',
  'error InvalidPool(address pool)',
  'error AccessControlMismatch(address suppliedAccessControl,address tokenAccessControl)',
  'error ZeroAddress()',
  'error InvalidLocalRecipient(address recipient)',
  'error EmptyBatch()',
  'error RecoveryNotPending(bytes32 recoveryId,uint8 currentStatus)',
  'error UnauthorizedRecoveryCaller(bytes32 recoveryId,address caller)',
  'error RecoveryNotReturnable(bytes32 recoveryId)',
  'error InvalidOriginalSender(address originalSender)',
  'error InvalidAmount(uint256 amount)',
  'error InsufficientEscrowFunding(uint256 tokenBalance,uint256 requiredBalance)',
  'error EscrowInsolvent(uint256 tokenBalance,uint256 totalReserved)',
  'error InsufficientCcipFee(uint256 supplied,uint256 required)',
  'error InvalidRouter(address router)',
  'error NativeRefundFailed(address recipient,uint256 amount)',
];

export const ccipPool = (address: string, signer: Signer) =>
  new Contract(address, CCIP_POOL_ABI, signer);

export const ccipEscrow = (address: string, signer: Signer) =>
  new Contract(address, CCIP_ESCROW_ABI, signer);

export const ccipPoolFactory = async (signer: Signer) => {
  const artifact = await artifacts.readArtifact('MidasCCTBurnMintTokenPool');
  return new ContractFactory(CCIP_POOL_ABI, artifact.bytecode, signer);
};

export type RecoveryRecord = {
  originalSender: string;
  originalRecipient: string;
  originalSourceChainSelector: BigNumber;
  amount: BigNumber;
  status: number;
  returnable: boolean;
  outboundCcipMessageId: string;
};

const asRecoveryRecord = (value: {
  originalSender: string;
  originalRecipient: string;
  originalSourceChainSelector: BigNumber;
  amount: BigNumber;
  status: number;
  returnable: boolean;
  outboundCcipMessageId: string;
}): RecoveryRecord => ({
  originalSender: value.originalSender,
  originalRecipient: value.originalRecipient,
  originalSourceChainSelector: BigNumber.from(
    value.originalSourceChainSelector,
  ),
  amount: BigNumber.from(value.amount),
  status: Number(value.status),
  returnable: value.returnable,
  outboundCcipMessageId: value.outboundCcipMessageId,
});

export type SnapshotActor = { label: string; address: string };

export type CcipSnapshot = {
  tokenBalances: Record<string, BigNumber>;
  totalSupply: BigNumber;
  recoveryCount: BigNumber;
  pendingCount: BigNumber;
  totalReserved: BigNumber;
  recovery?: RecoveryRecord;
  routerAllowance: BigNumber;
  escrowNativeBalance: BigNumber;
  routerNativeBalance: BigNumber;
  offRampState?: number;
};

export const snapshotCcipState = async (params: {
  token: Contract;
  escrow: Contract;
  router: Contract;
  actors: SnapshotActor[];
  recoveryId?: string;
  offRamp?: Contract;
  messageId?: string;
}): Promise<CcipSnapshot> => {
  const escrow = ccipEscrow(params.escrow.address, params.escrow.signer);
  const tokenBalances: Record<string, BigNumber> = {};
  for (const actor of params.actors) {
    tokenBalances[actor.label] = await params.token.balanceOf(actor.address);
  }

  const recovery = params.recoveryId
    ? asRecoveryRecord(await escrow.recoveries(params.recoveryId))
    : undefined;

  return {
    tokenBalances,
    totalSupply: await params.token.totalSupply(),
    recoveryCount: await escrow.recoveryCount(),
    pendingCount: await escrow.pendingCount(),
    totalReserved: await escrow.totalReserved(),
    recovery,
    routerAllowance: await params.token.allowance(
      params.escrow.address,
      params.router.address,
    ),
    escrowNativeBalance: await ethers.provider.getBalance(
      params.escrow.address,
    ),
    routerNativeBalance: await ethers.provider.getBalance(
      params.router.address,
    ),
    offRampState:
      params.offRamp && params.messageId
        ? Number(await params.offRamp.getExecutionState(params.messageId))
        : undefined,
  };
};

const normalize = (value: unknown): unknown => {
  if (BigNumber.isBigNumber(value)) return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalize(entry)]),
    );
  }
  return value;
};

export const expectSnapshotUnchanged = (
  before: CcipSnapshot,
  after: CcipSnapshot,
) => expect(normalize(after)).deep.eq(normalize(before));

export const expectFundedRecovery = async (params: {
  escrow: Contract;
  token: Contract;
  recoveryId: string;
  originalSender: string;
  originalRecipient: string;
  sourceSelector: BigNumberish;
  amount: BigNumberish;
  returnable?: boolean;
}) => {
  const escrow = ccipEscrow(params.escrow.address, params.escrow.signer);
  const record = asRecoveryRecord(await escrow.recoveries(params.recoveryId));
  const reserve: BigNumber = await escrow.totalReserved();

  expect(record.originalSender).eq(params.originalSender);
  expect(record.originalRecipient).eq(params.originalRecipient);
  expect(record.originalSourceChainSelector).eq(params.sourceSelector);
  expect(record.amount).eq(params.amount);
  expect(record.status).eq(RecoveryStatus.Pending);
  if (params.returnable !== undefined) {
    expect(record.returnable).eq(params.returnable);
  }
  expect(record.outboundCcipMessageId).eq(constants.HashZero);
  expect(await params.token.balanceOf(params.escrow.address)).gte(reserve);
};

export const expectNoFundedRecovery = async (params: {
  escrow: Contract;
  recoveryId: string;
}) => {
  const escrow = ccipEscrow(params.escrow.address, params.escrow.signer);
  const record = asRecoveryRecord(await escrow.recoveries(params.recoveryId));
  expect(record.status).eq(RecoveryStatus.None);
  expect(record.amount).eq(0);
};

export const RECOVERY_ID_DOMAIN = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('MIDAS_CCT_RECOVERY_V1'),
);

export const expectedRecoveryId = (params: {
  chainId: BigNumberish;
  escrow: string;
  nonce: BigNumberish;
  originalSender: string;
  originalRecipient: string;
  sourceSelector: BigNumberish;
  amount: BigNumberish;
}) =>
  ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      [
        'bytes32',
        'uint256',
        'address',
        'uint256',
        'address',
        'address',
        'uint64',
        'uint256',
      ],
      [
        RECOVERY_ID_DOMAIN,
        params.chainId,
        params.escrow,
        params.nonce,
        params.originalSender,
        params.originalRecipient,
        params.sourceSelector,
        params.amount,
      ],
    ),
  );

export const buildExpectedReturnMessage = (params: {
  token: string;
  amount: BigNumberish;
  originalSender: string;
}) => ({
  receiver: ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [params.originalSender],
  ),
  data: '0x',
  tokenAmounts: [{ token: params.token, amount: params.amount }],
  feeToken: constants.AddressZero,
  extraArgs: CCIP_V2_BASIC_EXTRA_ARGS,
});
