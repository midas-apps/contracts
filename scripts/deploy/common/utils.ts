import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  DeployProxyOptions,
  StandaloneOptions,
} from '@openzeppelin/hardhat-upgrades/dist/utils';
import {
  ethers,
  BigNumber,
  constants,
  ContractFactory,
  PopulatedTransaction,
  Signer,
} from 'ethers';
import { EIP1193Provider, HardhatRuntimeEnvironment } from 'hardhat/types';

import { AsyncLocalStorage } from 'node:async_hooks';

import { DeploymentConfig } from './types';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  isLibraryName,
  LibraryName,
} from '../../../config/constants/addresses';
import {
  etherscanVerify,
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import { MidasTimelockManager } from '../../../typechain-types';
import { verifyReinitializersConsumed } from '../../upgrades/common/reinitializer';
import { getDeploymentConfigForToken } from '../configs';

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

  if (customSigner.type !== 'hardhatSigner') {
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

/**
 * Resolves addresses of the external libraries `contractName` has to be
 * linked against from the `libraries` section of the network addresses
 */
export const getLinkedLibraries = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
) => {
  const { linkReferences } = await hre.artifacts.readArtifact(contractName);
  const deployedLibraries = getCurrentAddresses(hre)?.libraries ?? {};

  const libraries: Partial<Record<LibraryName, string>> = {};

  for (const libraryName of Object.values(linkReferences).flatMap((v) =>
    Object.keys(v),
  )) {
    if (!isLibraryName(libraryName)) {
      throw new Error(`Library ${libraryName} is not supported`);
    }

    const libraryAddress = deployedLibraries[libraryName];

    if (!libraryAddress) {
      throw new Error(
        `Library ${libraryName} is not deployed, run deploy:library --lib ${libraryName} first`,
      );
    }

    await assertLibraryBytecodeMatches(hre, libraryName, libraryAddress);

    libraries[libraryName] = libraryAddress;
  }

  return libraries;
};

/**
 * Ensures that the runtime bytecode of the library deployed at `libraryAddress`
 * matches the locally compiled library, so contracts are never linked against
 * an outdated library version
 */
const assertLibraryBytecodeMatches = async (
  hre: HardhatRuntimeEnvironment,
  libraryName: LibraryName,
  libraryAddress: string,
) => {
  const redeployHint = `deploy the new library version first (deploy:library --lib ${libraryName}) and update the libraries section of the network addresses`;

  const { deployedBytecode, deployedLinkReferences } =
    await hre.artifacts.readArtifact(libraryName);

  if (Object.keys(deployedLinkReferences).length > 0) {
    throw new Error(
      `Library ${libraryName} links against other libraries, bytecode check is not supported`,
    );
  }

  // library runtime code starts with PUSH20 <address> (call protection),
  // the placeholder is filled with the library address during deployment
  const callProtectionPlaceholder = '0x73' + '00'.repeat(20);

  if (!deployedBytecode.toLowerCase().startsWith(callProtectionPlaceholder)) {
    throw new Error(
      `Library ${libraryName} bytecode has unexpected format, unable to verify it`,
    );
  }

  const expectedBytecode = (
    '0x73' +
    libraryAddress.slice(2) +
    deployedBytecode.slice(callProtectionPlaceholder.length)
  ).toLowerCase();

  const onchainBytecode = (
    await hre.ethers.provider.getCode(libraryAddress)
  ).toLowerCase();

  if (onchainBytecode === '0x') {
    throw new Error(
      `Library ${libraryName} has no code at ${libraryAddress}, ${redeployHint}`,
    );
  }

  if (onchainBytecode !== expectedBytecode) {
    throw new Error(
      `Library ${libraryName} bytecode at ${libraryAddress} does not match the local bytecode, ${redeployHint}`,
    );
  }
};

/**
 * Creates a contract factory linked against the external libraries of
 * `contractName` and extends `opts` to allow external library linking
 * for the upgrades plugin when needed
 */
export const getLinkedContractFactory = async <TOpts extends StandaloneOptions>(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  signer: Signer,
  opts: TOpts,
): Promise<{ factory: ContractFactory; opts: TOpts }> => {
  const libraries = await getLinkedLibraries(hre, contractName);
  const hasLibraries = Object.keys(libraries).length > 0;

  if (hasLibraries) {
    console.log(
      `WARNING, using external linking libraries for ${contractName}`,
      libraries,
    );
  }

  const factory = await hre.ethers.getContractFactory(contractName, {
    signer,
    libraries,
  });

  return {
    factory,
    opts: hasLibraries
      ? {
          ...opts,
          unsafeAllow: [
            ...(opts.unsafeAllow ?? []),
            'external-library-linking',
          ],
        }
      : opts,
  };
};

export const deployProxy = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  params: unknown[],
  deployer?: Signer,
  opts: DeployProxyOptions = {},
) => {
  deployer ??= await getDeployer(hre);

  const { factory, opts: linkedOpts } = await getLinkedContractFactory(
    hre,
    contractName,
    deployer,
    opts,
  );

  const deployment = await hre.upgrades.deployProxy(
    factory,
    params,
    linkedOpts,
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

export const deployAndVerifyLibrary = async (
  hre: HardhatRuntimeEnvironment,
  libraryName: LibraryName,
  deployer?: Signer,
) => {
  deployer ??= await getDeployer(hre);

  const factory = await hre.ethers.getContractFactory(libraryName, deployer);

  const deployment = await factory.deploy();

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }

  logDeploy(libraryName, 'Library', deployment.address);
  await etherscanVerify(hre, deployment.address, libraryName).catch((err) => {
    console.error('Unable to verify. Error: ', err);
  });

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
      | 'set-usyc-deposits-enabled'
      | 'set-usyc-paired-vault'
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
      | 'set-user-facing-roles'
      | 'set-role-admin'
      | 'set-function-permissions';
    /** skip the signer's tx simulation, e.g. for a call valid only after an upgrade */
    skipPrediction?: boolean;
    /** on-chain fields changed by the tx, for the sync report. Not sent to the signer */
    changes?: FieldChange[];
    /** sync only merges bulk calls with the same key. Not sent to the signer */
    batchKey?: string;
  },
  safe?: string,
  confirmations = 2,
) => {
  const hreNetwork: HardhatRuntimeEnvironment = hre;

  const networkCustomSigner = await hreNetwork.getCustomSigner();

  const signerMetadata = { ...(txSignMetadata ?? {}) };
  delete signerMetadata.changes;
  delete signerMetadata.batchKey;

  const transaction = {
    data: populatedTx.data!,
    to: populatedTx.to!,
    value: populatedTx.value,
  };

  const res = safe
    ? await networkCustomSigner.proposeSafeTransaction(transaction, {
        safe,
        comment: txSignMetadata?.comment,
      })
    : await networkCustomSigner.sendTransaction(transaction, {
        ...signerMetadata,
        chainId: hreNetwork.network.config.chainId,
        idempotenceId: txSignMetadata?.idempotenceId ?? hreNetwork.contextId,
      });

  if (res.type === 'calldataSigner') {
    return `calldata #${res.payload.index}`;
  }

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
    'Tx' + (networkCustomSigner.type === 'customSigner' ? '' : ' Submitted'),
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

/** `safeMiddlewareWallet` if it is a contract (assumed a Safe), else undefined */
const getSafeCaller = async (
  hre: HardhatRuntimeEnvironment,
  safeMiddlewareWallet?: string,
) => {
  if (!safeMiddlewareWallet) return undefined;

  if ((await hre.ethers.provider.getCode(safeMiddlewareWallet)) === '0x') {
    console.warn('Safe wallet is passed but caller is not a contract');
    return undefined;
  }

  return safeMiddlewareWallet;
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

  const safeCaller = await getSafeCaller(hre, safeMiddlewareWallet);

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
    safeCaller,
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
  const [
    hre,
    populatedTx,
    txSignMetadata,
    safeMiddlewareWallet,
    confirmations,
  ] = args;

  if (
    recordTx({
      tx: populatedTx,
      metadata: txSignMetadata,
      safeMiddlewareWallet,
    })
  ) {
    return 'planned';
  }

  const safeCaller = await getSafeCaller(hre, safeMiddlewareWallet);

  const proposer =
    safeCaller ??
    (await getWalletAddressForAction(
      hre,
      txSignMetadata?.action ?? '',
      txSignMetadata?.mToken,
    ));

  const timelock = await getTimelockRequirement(hre, populatedTx, proposer);

  if (!timelock) {
    return sendAndWaitForCustomTxSignDirect(
      hre,
      populatedTx,
      txSignMetadata,
      safeCaller,
      confirmations,
    );
  }

  const { timelockManager, role, delay } = timelock;

  return scheduleTimelockOperationTx(
    timelockManager,
    `role: ${role}, delay: ${delay}s`,
    hre,
    populatedTx,
    txSignMetadata,
    safeCaller,
    confirmations,
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
