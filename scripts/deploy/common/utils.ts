import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { BigNumberish, PopulatedTransaction, Signer } from 'ethers';
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
  opts: DeployProxyOptions = { unsafeAllow: ['constructor'] },
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
  opts: DeployProxyOptions = { unsafeAllow: ['constructor'] },
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

export const sendAndWaitForCustomTxSign = async (
  hre: HardhatRuntimeEnvironment,
  populatedTx: PopulatedTransaction,
  txSignMetadata?: {
    comment?: string;
    action?:
      | 'update-vault'
      | 'update-ac'
      | 'update-feed-mtoken'
      | 'update-feed-ptoken';
    subAction?: 'add-payment-token' | 'grant-token-roles';
  },
  confirmations = 2,
) => {
  const signResult = hre.customSigner!.signTransaction(
    {
      data: populatedTx.data!,
      to: populatedTx.to!,
      value: populatedTx.value,
    },
    txSignMetadata,
  );

  const res = await signResult;

  if (res.type === 'customSigner') {
    console.log('Custom tx sign result detected, skipping...');
    return res.payload;
  }

  console.log('Sending tx...');
  const tx = await hre.ethers.provider.sendTransaction(res.signedTx);
  console.log('Sending tx...', tx.hash);

  await tx.wait(confirmations);

  return tx.hash;
};
