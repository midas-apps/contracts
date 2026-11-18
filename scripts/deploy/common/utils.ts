import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { BigNumberish, ethers, PopulatedTransaction, Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import path from 'path';

import { DeploymentConfig } from './types';

import { ENV, MTokenName } from '../../../config';
import {
  etherscanVerify,
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import { configsPerToken } from '../configs';

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

export const getDeployer = async (hre: HardhatRuntimeEnvironment) => {
  const customSigner = await hre.getCustomSigner();

  if (customSigner.type === 'customSigner') {
    const customProvider = await customSigner.getWeb3Provider({
      action: 'deployer',
    });

    const provider = new hre.ethers.providers.Web3Provider(customProvider);
    const signer = provider.getSigner();
    return await SignerWithAddress.create(signer);
  } else {
    const { deployer } = await hre.getNamedAccounts();
    return await hre.ethers.getSigner(deployer);
  }
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
  await etherscanVerify(hre, deployment.address, ...params);

  return deployment;
};

export const getDeploymentGenericConfigOptional = <
  TConfigKey extends keyof DeploymentConfig['genericConfigs'],
  TConfig extends DeploymentConfig['genericConfigs'][TConfigKey],
>(
  token: MTokenName,
  configKey: TConfigKey,
) => {
  return configsPerToken[token]?.genericConfigs?.[configKey] as
    | TConfig
    | undefined;
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
  const config = configsPerToken[token]?.networkConfigs?.[
    hre.network.config.chainId!
  ]?.[configKey] as TConfig;

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

const proposeSafeTransaction = async (
  hre: HardhatRuntimeEnvironment,
  transaction: { data: string; to: string; value?: BigNumberish },
  metadata: { safe: string; comment?: string },
) => {
  const scriptPath = ENV.CUSTOM_SIGNER_SCRIPT_PATH;

  if (!scriptPath) {
    throw new Error(
      'Safe transactions require the custom signer, set CUSTOM_SIGNER_SCRIPT_PATH',
    );
  }

  const { proposeEVMSafeTransaction } = await import(path.resolve(scriptPath));

  if (!proposeEVMSafeTransaction) {
    throw new Error(
      'Custom signer checkout is outdated: proposeEVMSafeTransaction export is missing',
    );
  }

  return {
    payload: await proposeEVMSafeTransaction(transaction, {
      ...metadata,
      chainId: hre.network.config.chainId,
    }),
  };
};

export const sendAndWaitForCustomTxSign = async (
  hre: HardhatRuntimeEnvironment,
  populatedTx: PopulatedTransaction,
  txSignMetadata?: {
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
      | 'deployer';
    subAction?:
      | 'add-payment-token'
      | 'grant-token-roles'
      | 'revoke-token-roles'
      | 'add-fee-waived'
      | 'set-round-data'
      | 'timelock-call-upgrade'
      | 'pause-function'
      | 'set-greenlist-enabled'
      | 'set-lz-rate-limit-configs'
      | 'set-aave-pool'
      | 'set-aave-deposits-enabled'
      | 'set-morpho-vault'
      | 'set-morpho-deposits-enabled'
      | 'set-auto-invest-fallback-enabled';
  },
  safeMiddlewareWallet?: string,
  confirmations = 2,
) => {
  const safe =
    safeMiddlewareWallet &&
    (await hre.ethers.provider.getCode(safeMiddlewareWallet)) !== '0x'
      ? safeMiddlewareWallet
      : undefined;

  if (safeMiddlewareWallet && !safe) {
    console.warn('Safe wallet is passed but caller is not a contract');
  }

  const hreNetwork: HardhatRuntimeEnvironment = hre;

  const networkCustomSigner = await hreNetwork.getCustomSigner();

  const transaction = {
    data: populatedTx.data!,
    to: populatedTx.to!,
    value: populatedTx.value,
  };

  const res = safe
    ? await proposeSafeTransaction(hre, transaction, {
        safe,
        comment: txSignMetadata?.comment,
      })
    : await networkCustomSigner.sendTransaction(transaction, {
        ...(txSignMetadata ?? {}),
        chainId: hreNetwork.network.config.chainId,
        idempotenceId: hreNetwork.contextId,
      });

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

export const toFunctionSelector = (signature: string) => {
  return ethers.utils.id(signature).slice(0, 10);
};
