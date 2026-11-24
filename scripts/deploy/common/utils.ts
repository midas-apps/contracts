import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import {
  ethers,
  BigNumber,
  constants,
  PopulatedTransaction,
  Signer,
} from 'ethers';
import { EIP1193Provider, HardhatRuntimeEnvironment } from 'hardhat/types';

import { AsyncLocalStorage } from 'node:async_hooks';

import { DeploymentConfig } from './types';

import { MTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  etherscanVerify,
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import { MidasTimelockManager } from '../../../typechain-types';
import { verifyReinitializersConsumed } from '../../upgrades/common/reinitializer';
import { getDeploymentConfigForToken } from '../configs';

const safeAbi = [
  {
    inputs: [],
    name: 'domainSeparator',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
      { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' },
      { internalType: 'uint256', name: 'baseGas', type: 'uint256' },
      { internalType: 'uint256', name: 'gasPrice', type: 'uint256' },
      { internalType: 'address', name: 'gasToken', type: 'address' },
      { internalType: 'address', name: 'refundReceiver', type: 'address' },
      { internalType: 'uint256', name: '_nonce', type: 'uint256' },
    ],
    name: 'encodeTransactionData',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
      { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' },
      { internalType: 'uint256', name: 'baseGas', type: 'uint256' },
      { internalType: 'uint256', name: 'gasPrice', type: 'uint256' },
      { internalType: 'address', name: 'gasToken', type: 'address' },
      {
        internalType: 'address payable',
        name: 'refundReceiver',
        type: 'address',
      },
      { internalType: 'bytes', name: 'signatures', type: 'bytes' },
    ],
    name: 'execTransaction',
    outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'enum Enum.Operation', name: 'operation', type: 'uint8' },
      { internalType: 'uint256', name: 'safeTxGas', type: 'uint256' },
      { internalType: 'uint256', name: 'baseGas', type: 'uint256' },
      { internalType: 'uint256', name: 'gasPrice', type: 'uint256' },
      { internalType: 'address', name: 'gasToken', type: 'address' },
      { internalType: 'address', name: 'refundReceiver', type: 'address' },
      { internalType: 'uint256', name: '_nonce', type: 'uint256' },
    ],
    name: 'getTransactionHash',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export const executeFuncAsync = async <T>(
  hre: HardhatRuntimeEnvironment,
  func: (hre: HardhatRuntimeEnvironment) => Promise<T>,
) => {
  try {
    const result = await func(hre);
    return result;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const CUSTOM_SIGNER_RPC_METHODS = new Set([
  'eth_accounts',
  'eth_requestAccounts',
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v4',
  'personal_sign',
]);

const withHardhatEthCalls = (
  customProvider: EIP1193Provider,
  hardhatProvider: HardhatRuntimeEnvironment['ethers']['provider'],
) => ({
  request: async ({
    method,
    params = [],
  }: {
    method: string;
    params?: unknown[];
  }) => {
    if (!CUSTOM_SIGNER_RPC_METHODS.has(method)) {
      return hardhatProvider.send(method, params);
    }

    return customProvider.request({ method, params });
  },
});

export const getDeployer = async (hre: HardhatRuntimeEnvironment) => {
  const customSigner = await hre.getCustomSigner();

  if (customSigner.type === 'customSigner') {
    const customProvider = await customSigner.getWeb3Provider({
      action: 'deployer',
    });

    const provider = new hre.ethers.providers.Web3Provider(
      withHardhatEthCalls(customProvider, hre.ethers.provider),
    );
    const signer = provider.getSigner();
    return await SignerWithAddress.create(signer);
  } else {
    const { deployer } = await hre.getNamedAccounts();
    return await hre.ethers.getSigner(deployer);
  }
};

export const getContractAt = async (
  hre: HardhatRuntimeEnvironment,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nameOrAbi: string | any[],
  address: string,
  signer?: Signer,
) => {
  return hre.ethers.getContractAt(
    nameOrAbi,
    address,
    signer ?? (await getDeployer(hre)),
  );
};

export const deployProxy = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  params: unknown[],
  deployer?: Signer,
  opts: DeployProxyOptions = {},
) => {
  deployer ??= await getDeployer(hre);

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(contractName, deployer),
    params,
    opts,
  );
  return deployment;
};

export const deployAndVerifyProxy = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  params: unknown[],
  deployer?: Signer,
  opts: DeployProxyOptions = {},
) => {
  const { abi } = await hre.artifacts.readArtifact(contractName);

  const deployment = await deployProxy(
    hre,
    contractName,
    params,
    deployer,
    opts,
  );

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  await verifyReinitializersConsumed({
    provider: hre.ethers.provider,
    proxyAddress: deployment.address,
    abi,
  });

  await logDeployProxy(hre, contractName, deployment.address);
  await tryEtherscanVerifyImplementation(
    hre,
    deployment.address,
    contractName,
    ...(opts?.constructorArgs ?? []),
  );

  return deployment;
};

export const deployAndVerify = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  params: unknown[],
  deployer?: Signer,
) => {
  const factory = await hre.ethers.getContractFactory(contractName, deployer);

  const deployment = await factory.deploy(...params);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  logDeploy(contractName, 'Proxy', deployment.address);
  await etherscanVerify(hre, deployment.address, contractName, ...params);

  return deployment;
};

export const getDeploymentGenericConfigOptional = <
  TConfigKey extends keyof DeploymentConfig['genericConfigs'],
  TConfig extends DeploymentConfig['genericConfigs'][TConfigKey],
>(
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  configKey: TConfigKey,
) => {
  return getDeploymentConfigForToken(token, hre.deploymentConfig)
    ?.genericConfigs?.[configKey] as TConfig | undefined;
};

export const getDeploymentGenericConfig = <
  TConfigKey extends keyof DeploymentConfig['genericConfigs'],
  TConfig extends DeploymentConfig['genericConfigs'][TConfigKey],
>(
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = getDeploymentGenericConfigOptional<TConfigKey, TConfig>(
    hre,
    token,
    configKey,
  );

  if (!config) {
    throw new Error('Deployment config is not found');
  }

  return config;
};

export const getNetworkConfig = <
  TConfigKey extends keyof DeploymentConfig['networkConfigs'][number],
  TConfig extends DeploymentConfig['networkConfigs'][number][TConfigKey],
>(
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = getDeploymentConfigForToken(token, hre.deploymentConfig)
    ?.networkConfigs?.[hre.network.config.chainId!]?.[configKey] as TConfig;

  if (!config) {
    throw new Error('Deployment config is not found');
  }

  return config;
};

export const getWalletAddressForAction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  mtoken?: MTokenName,
  chainId?: number,
) => {
  const customSigner = await hre.getCustomSigner();
  return await customSigner.getWalletAddress(action, mtoken, chainId);
};

/** An on-chain field changed by a tx: `field` goes from `current` to `target` */
export type FieldChange = {
  field: string;
  current: unknown;
  target: unknown;
};

const sendAndWaitForCustomTxSignDirect = async (
  hre: HardhatRuntimeEnvironment,
  populatedTx: PopulatedTransaction,
  txSignMetadata?: {
    idempotenceId?: string;
    mToken?: MTokenName;
    comment?: string;
    action?:
      | 'update-vault'
      | 'update-ac'
      | 'update-feed-mtoken'
      | 'update-feed-ptoken'
      | 'update-timelock'
      | 'update-lz'
      | 'update-lz-oapp-config'
      | 'axelar-wire-tokens'
      | 'axelar-update-config'
      | 'update-token'
      | 'deployer'
      | 'update-pause-manager';
    subAction?:
      | 'add-payment-token'
      | 'grant-token-roles'
      | 'revoke-token-roles'
      | 'add-fee-waived'
      | 'set-round-data'
      | 'timelock-call-upgrade'
      | 'pause-function'
      | 'pause-contract'
      | 'set-vault-setting'
      | 'set-greenlist-enabled'
      | 'set-lz-rate-limit-configs'
      | 'set-aave-pool'
      | 'set-aave-deposits-enabled'
      | 'set-morpho-vault'
      | 'set-morpho-deposits-enabled'
      | 'set-auto-invest-fallback-enabled'
      | 'set-instant-limit'
      | 'set-mint-rate-limit'
      | 'set-wallet-bucket'
      | 'set-max-supply-cap'
      | 'set-clawback-receiver'
      | 'free-from-min-amount'
      | 'set-prefer-loan-liquidity'
      | 'set-mtoken-deposits-enabled'
      | 'set-ustb-deposits-enabled'
      | 'set-user-facing-roles';
    /** on-chain fields changed by the tx, for the sync report. Not sent to the signer */
    changes?: FieldChange[];
  },
  safeMiddlewareWallet?: string,
  confirmations = 2,
) => {
  if (safeMiddlewareWallet) {
    const callerCode = await hre.ethers.provider.getCode(safeMiddlewareWallet);

    const isCallerContract = callerCode !== '0x';

    if (isCallerContract) {
      console.log(
        'Caller is a contract, assuming it is a safe contract to execute tx',
      );

      // we assume that the owner contract is a safe contract
      const safeContract = await getContractAt(
        hre,
        safeAbi,
        safeMiddlewareWallet,
      );

      const owners: string[] = await safeContract.getOwners();

      const ownerForSignature = await getWalletAddressForAction(
        hre,
        txSignMetadata?.action ?? '',
      );

      if (
        !owners.find((v) => v.toLowerCase() === ownerForSignature.toLowerCase())
      ) {
        throw new Error(
          `Owner ${ownerForSignature} is not found in the safe contract, allowed callers: [${owners.join(
            ', ',
          )}]`,
        );
      }

      populatedTx = await safeContract.populateTransaction.execTransaction(
        populatedTx.to,
        populatedTx.value ?? 0,
        populatedTx.data,
        0,
        0,
        0,
        0,
        constants.AddressZero,
        constants.AddressZero,
        // FIXME: for some reason, encode of 1 is required to be padded, so abi coder does not produce
        // the required result with encode(['address', 'uint256'], [ownerForSignature, 1])
        hre.ethers.utils.defaultAbiCoder.encode(
          ['address'],
          [ownerForSignature],
        ) +
          '000000000000000000000000000000000000000000000000000000000000000001',
      );
    } else {
      console.warn('Safe wallet is passed but caller is not a contract');
    }
  }

  const hreNetwork: HardhatRuntimeEnvironment = hre;

  const networkCustomSigner = await hreNetwork.getCustomSigner();

  const signerMetadata = { ...(txSignMetadata ?? {}) };
  delete signerMetadata.changes;

  const sendResult = networkCustomSigner.sendTransaction(
    {
      data: populatedTx.data!,
      to: populatedTx.to!,
      value: populatedTx.value,
    },
    {
      ...signerMetadata,
      chainId: hreNetwork.network.config.chainId,
      idempotenceId: txSignMetadata?.idempotenceId ?? hreNetwork.contextId,
    },
  );

  const res = await sendResult;

  let resToReturn: unknown;

  if ('payload' in res) {
    console.log('Custom tx sign result detected, skipping...');
    resToReturn = res.payload;
    const txId = (res.payload as { txId?: string })?.txId ?? 'unknown';
    const comment = txSignMetadata?.comment ?? '';
    console.log(`${txId} - ${comment}`);
  } else if ('tx' in res) {
    logDeploy('Tx Submitted', hreNetwork.network.name, res.tx.hash);
    await res.tx.wait(confirmations);
    resToReturn = res.tx.hash;
  } else {
    throw new Error('Unknown tx signer type');
  }

  logDeploy(
    'Tx' + networkCustomSigner.type === 'customSigner' ? '' : ' Submitted',
    hreNetwork.network.name,
    typeof resToReturn === 'object'
      ? JSON.stringify(resToReturn)
      : (resToReturn as string),
  );

  return resToReturn;
};

/**
 * Resolves whether `populatedTx` must go through the timelock for `proposer`.
 * Uses the timelock manager preflight (`getTargetRole`), which only succeeds
 * for functions guarded by a timelock-aware modifier, so any revert there means
 * the call is not timelocked (or the proposer has no access) and is sent as is.
 */
const getTimelockRequirement = async (
  hre: HardhatRuntimeEnvironment,
  populatedTx: PopulatedTransaction,
  proposer: string,
) => {
  const acAddress = getCurrentAddresses(hre)?.accessControl;
  if (!acAddress) return undefined;

  const ac = await hre.ethers.getContractAt('MidasAccessControl', acAddress);

  // legacy access control has no timelock manager
  const timelockManagerAddress = await ac
    .timelockManager()
    .catch(() => constants.AddressZero);
  if (timelockManagerAddress === constants.AddressZero) return undefined;

  const timelockManager = await hre.ethers.getContractAt(
    'MidasTimelockManager',
    timelockManagerAddress,
  );

  const targetRole = await timelockManager
    .getTargetRole(populatedTx.to!, populatedTx.data!, proposer)
    .catch(() => undefined);
  if (!targetRole) return undefined;

  const [role, overrideDelay] = targetRole;

  const [delay] = await ac.getRoleTimelockDelay(role, overrideDelay);
  if (delay === 0) return undefined;

  return { timelockManager, role, delay };
};

/**
 * Wraps the tx into `MidasTimelockManager.scheduleTimelockOperation` and sends
 * it via the custom signer
 */
const scheduleTimelockOperationTx = async (
  timelockManager: MidasTimelockManager,
  reason: string,
  ...args: Parameters<typeof sendAndWaitForCustomTxSignDirect>
) => {
  const [
    hre,
    populatedTx,
    txSignMetadata,
    safeMiddlewareWallet,
    confirmations,
  ] = args;

  if (populatedTx.value && !BigNumber.from(populatedTx.value).isZero()) {
    throw new Error('Timelocked operations do not support msg.value');
  }

  const operationId = await timelockManager.getOperationId(
    populatedTx.to!,
    populatedTx.data!,
  );

  console.log(
    `Tx to ${populatedTx.to} requires timelock (${reason}), scheduling via ${timelockManager.address}`,
  );

  const scheduleTx =
    await timelockManager.populateTransaction.scheduleTimelockOperation({
      target: populatedTx.to!,
      data: populatedTx.data!,
    });

  const txId = await sendAndWaitForCustomTxSignDirect(
    hre,
    scheduleTx,
    {
      ...txSignMetadata,
      comment: `[timelock schedule] ${txSignMetadata?.comment ?? ''}`,
    },
    safeMiddlewareWallet,
    confirmations,
  );

  console.log(
    `Timelock operation scheduled. Operation id: ${operationId}, tx id: ${
      typeof txId === 'object' ? JSON.stringify(txId) : txId
    }`,
  );

  return txId;
};

export type TxSignMetadata = NonNullable<
  Parameters<typeof sendAndWaitForCustomTxSignDirect>[2]
>;

/** A tx recorded by `collectTxs` instead of being sent */
export type PlannedTx = {
  tx: PopulatedTransaction;
  metadata?: TxSignMetadata;
  safeMiddlewareWallet?: string;
  /** sent via `sendAndWaitForTimelockedTxSign` */
  alwaysTimelocked?: boolean;
};

type TxCollector = { txs: PlannedTx[]; skipped: string[] };

const txCollector = new AsyncLocalStorage<TxCollector>();

/**
 * Runs `fn` with the send helpers recording txs instead of sending them.
 * Returns the recorded txs in the order they were sent and the reasons of
 * the parts skipped via `logSkipped`
 */
export const collectTxs = async (fn: () => Promise<unknown>) => {
  const collector: TxCollector = { txs: [], skipped: [] };
  await txCollector.run(collector, fn);
  return collector;
};

/** Records the tx when called inside `collectTxs` */
const recordTx = (planned: PlannedTx) => {
  const collector = txCollector.getStore();
  if (!collector) return false;

  collector.txs.push(planned);
  return true;
};

/** Logs a skipped part of a step, also reported by `collectTxs` */
export const logSkipped = (reason: string) => {
  console.warn(`Skipped: ${reason}`);
  txCollector.getStore()?.skipped.push(reason);
};

/**
 * Sends a tx via the custom signer. If the call requires a timelock for the
 * sender, it is wrapped into `MidasTimelockManager.scheduleTimelockOperation`
 */
export const sendAndWaitForCustomTxSign = async (
  ...args: Parameters<typeof sendAndWaitForCustomTxSignDirect>
) => {
  const [hre, populatedTx, txSignMetadata, safeMiddlewareWallet] = args;

  if (
    recordTx({
      tx: populatedTx,
      metadata: txSignMetadata,
      safeMiddlewareWallet,
    })
  ) {
    return 'planned';
  }

  const safeCaller =
    safeMiddlewareWallet &&
    (await hre.ethers.provider.getCode(safeMiddlewareWallet)) !== '0x'
      ? safeMiddlewareWallet
      : undefined;

  const proposer =
    safeCaller ??
    (await getWalletAddressForAction(
      hre,
      txSignMetadata?.action ?? '',
      txSignMetadata?.mToken,
    ));

  const timelock = await getTimelockRequirement(hre, populatedTx, proposer);

  if (!timelock) {
    return sendAndWaitForCustomTxSignDirect(...args);
  }

  const { timelockManager, role, delay } = timelock;

  return scheduleTimelockOperationTx(
    timelockManager,
    `role: ${role}, delay: ${delay}s`,
    ...args,
  );
};

/**
 * Same as `sendAndWaitForCustomTxSign`, but for the calls that are always
 * timelocked (constant override delay). Skips the on-chain detection, which
 * sends the tx as is when the access control is not wired or the role is not
 * granted yet, and always schedules via the timelock manager of the network
 */
export const sendAndWaitForTimelockedTxSign = async (
  ...args: Parameters<typeof sendAndWaitForCustomTxSignDirect>
) => {
  const [hre, populatedTx, txSignMetadata, safeMiddlewareWallet] = args;

  if (
    recordTx({
      tx: populatedTx,
      metadata: txSignMetadata,
      safeMiddlewareWallet,
      alwaysTimelocked: true,
    })
  ) {
    return 'planned';
  }

  const timelockManagerAddress = getCurrentAddresses(hre)?.timelockManager;

  if (!timelockManagerAddress) {
    throw new Error('Timelock manager address is not set');
  }

  const timelockManager = await hre.ethers.getContractAt(
    'MidasTimelockManager',
    timelockManagerAddress,
  );

  return scheduleTimelockOperationTx(
    timelockManager,
    'always timelocked',
    ...args,
  );
};

/**
 * Pause manager of the access control, the one that vaults and tokens check.
 * If the access control is not wired yet, falls back to the configured pause
 * manager (the one `wire:ac` wires): txs to it can be submitted now and
 * executed once `initializeRelationships` is executed. Undefined (logged as
 * skipped) if there is none
 */
export const getPauseManager = async (
  hre: HardhatRuntimeEnvironment,
  accessControlAddress: string,
) => {
  const ac = await getContractAt(
    hre,
    'MidasAccessControl',
    accessControlAddress,
  );
  let pauseManager: string = await ac.pauseManager();

  if (pauseManager === constants.AddressZero) {
    const configured = getCurrentAddresses(hre)?.pauseManager;

    if (!configured) {
      logSkipped(
        `access control ${accessControlAddress} has no pause manager and none is configured`,
      );
      return undefined;
    }

    console.warn(
      `access control ${accessControlAddress} is not wired yet (initializeRelationships), using the configured pause manager ${configured}: the txs can be executed only after the wiring`,
    );
    pauseManager = configured;
  }

  return hre.ethers.getContractAt('MidasPauseManager', pauseManager);
};

export const toFunctionSelector = (signature: string) => {
  return ethers.utils.id(signature).slice(0, 10);
};
