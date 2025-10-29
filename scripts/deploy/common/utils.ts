import { JsonRpcProvider } from '@ethersproject/providers';
import { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import ethers, { constants, PopulatedTransaction, Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeploymentConfig } from './types';

import { chainIds, MTokenName, Network, rpcUrls } from '../../../config';
import { getHreByNetworkName } from '../../../helpers/hardhat';
import {
  etherscanVerify,
  logDeploy,
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import { configsPerToken } from '../configs';

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
  await tryEtherscanVerifyImplementation(
    hre,
    deployment.address,
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
  const customSigner = await hre.getCustomSigner();
  return await customSigner.getWalletAddress(action, mtoken);
};

export const sendAndWaitForCustomTxSign = async (
  hre: HardhatRuntimeEnvironment,
  populatedTx: PopulatedTransaction,
  txSignMetadata?: {
    mToken?: MTokenName;
    comment?: string;
    network?: Network;
    action?:
      | 'update-vault'
      | 'update-ac'
      | 'update-feed-mtoken'
      | 'update-feed-ptoken'
      | 'update-timelock'
      | 'update-lz'
      | 'update-lz-oapp-config'
      | 'axelar-wire-tokens';
    subAction?:
      | 'add-payment-token'
      | 'grant-token-roles'
      | 'revoke-token-roles'
      | 'add-fee-waived'
      | 'set-round-data'
      | 'timelock-call-upgrade'
      | 'pause-function'
      | 'set-lz-rate-limit-configs';
  },
  safeMiddlewareWallet?: string,
  confirmations = 2,
) => {
  const provider = txSignMetadata?.network
    ? new JsonRpcProvider(rpcUrls[txSignMetadata.network])
    : hre.ethers.provider;

  if (safeMiddlewareWallet) {
    const callerCode = await provider.getCode(safeMiddlewareWallet);

    const isCallerContract = callerCode !== '0x';

    if (isCallerContract) {
      console.log(
        'Caller is a contract, assuming it is a safe contract to execute tx',
      );

      // we assume that the owner contract is a safe contract
      const safeContract = await hre.ethers
        .getContractAt(safeAbi, safeMiddlewareWallet)
        .then((v) => v.connect(provider));

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

  let hreNetwork: HardhatRuntimeEnvironment = hre;

  if (txSignMetadata?.network && txSignMetadata.network !== hre.network.name) {
    hreNetwork = await getHreByNetworkName(txSignMetadata.network);
  }

  const networkCustomSigner = await hreNetwork.getCustomSigner();

  const sendResult = networkCustomSigner.sendTransaction(
    {
      data: populatedTx.data!,
      to: populatedTx.to!,
      value: populatedTx.value,
    },
    {
      ...(txSignMetadata ?? {}),
      chainId: txSignMetadata?.network
        ? chainIds[txSignMetadata.network as Network]
        : undefined,
      idempotenceId: hreNetwork.contextId,
    },
  );

  const res = await sendResult;

  let resToReturn: unknown;

  if (res.type === 'customSigner') {
    console.log('Custom tx sign result detected, skipping...');
    resToReturn = res.payload;
  } else if (res.type === 'hardhatSigner') {
    logDeploy('Tx Submitted', hreNetwork.network.name, res.tx.hash);
    await res.tx.wait(confirmations);
    resToReturn = res.tx.hash;
  } else {
    throw new Error('Unknown tx signer type');
  }

  logDeploy(
    'Tx' + res.type === 'customSigner' ? '' : ' Submitted',
    hreNetwork.network.name,
    typeof resToReturn === 'object'
      ? JSON.stringify(resToReturn)
      : (resToReturn as string),
  );
};

export const toFunctionSelector = (signature: string) => {
  return ethers.utils.id(signature).slice(0, 10);
};
