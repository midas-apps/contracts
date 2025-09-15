import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { PopulatedTransaction, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeploymentConfig } from './types';

import { MTokenName } from '../../../config';
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
  const { deployer } = await hre.getNamedAccounts();
  return await hre.ethers.getSigner(deployer);
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
  await tryEtherscanVerifyImplementation(hre, deployment.address);

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

export const getDeploymentGenericConfig = <
  TConfigKey extends keyof DeploymentConfig['genericConfigs'],
  TConfig extends DeploymentConfig['genericConfigs'][TConfigKey],
>(
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  configKey: TConfigKey,
) => {
  const config = configsPerToken[token]?.genericConfigs?.[configKey] as TConfig;

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
) => {
  return hre.customSigner!.getWalletAddress(action, mtoken);
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
      | 'update-timelock';
    subAction?:
      | 'add-payment-token'
      | 'grant-token-roles'
      | 'add-fee-waived'
      | 'set-round-data'
      | 'timelock-call-upgrade'
      | 'pause-function';
  },
  confirmations = 2,
) => {
  const sendResult = hre.customSigner!.sendTransaction(
    {
      data: populatedTx.data!,
      to: populatedTx.to!,
      value: populatedTx.value,
    },
    txSignMetadata,
  );

  const res = await sendResult;

  if (res.type === 'customSigner') {
    console.log('Custom tx sign result detected, skipping...');
    return res.payload;
  }

  if (res.type === 'hardhatSigner') {
    await res.tx.wait(confirmations);
    return res.tx.hash;
  }

  throw new Error('Unknown tx signer type');
};

export const toFunctionSelector = (signature: string) => {
  return ethers.utils.id(signature).slice(0, 10);
};
