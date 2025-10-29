import {
  AxelarQueryAPI,
  CHAINS,
  Environment,
} from '@axelar-network/axelarjs-sdk';
import { BigNumberish, constants, ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  axelarItsAbi,
  axelarItsAddress,
  axelarItsFactoryAbi,
  axelarItsFactoryAddress,
} from './contracts';

import {
  axelarChainNames,
  isTestnetNetwork,
  MTokenName,
  Network,
} from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import { getDeployer } from '../../scripts/deploy/common/utils';
import { logDeploy } from '../utils';

export const calculateSalt = (
  mToken: MTokenName,
  action = 'default-axelar-its-deployment',
) => {
  return ethers.utils.solidityKeccak256(
    ['string', 'string', 'string'],
    ['Midas', mToken, action],
  );
};

export const calculateDeploySalt = async (
  hre: HardhatRuntimeEnvironment,
  senderAddress: string,
  salt: string,
) => {
  const itsFactory = await hre.ethers.getContractAt(
    axelarItsFactoryAbi,
    axelarItsFactoryAddress,
  );

  return await itsFactory.linkedTokenDeploySalt(senderAddress, salt);
};

export const getTokenId = async (
  hre: HardhatRuntimeEnvironment,
  deploySalt: string,
) => {
  const its = await hre.ethers.getContractAt(axelarItsAbi, axelarItsAddress);
  return await its.interchainTokenId(constants.AddressZero, deploySalt);
};

export const axelarInterchainTransfer = async (
  hre: HardhatRuntimeEnvironment,
  amount: BigNumberish,
  {
    destinationNetwork,
    mToken,
    destinationAddress,
  }: {
    mToken: MTokenName;
    destinationNetwork: Network;
    destinationAddress?: string;
  },
) => {
  const deployer = await getDeployer(hre);
  const its = await hre.ethers.getContractAt(
    axelarItsAbi,
    axelarItsAddress,
    deployer,
  );

  const addresses = getCurrentAddresses(hre);
  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses || !mTokenAddresses?.axelar?.tokenId) {
    throw new Error('Token addresses are not found');
  }

  const destinationAxelarNetworkName = axelarChainNames[destinationNetwork];
  const axelarNetworkName = axelarChainNames[hre.network.name as Network];
  destinationAddress ??= deployer.address;

  const isTestnet = isTestnetNetwork(hre.network.name as Network);
  const axelarSdk = new AxelarQueryAPI({
    environment: isTestnet ? Environment.TESTNET : Environment.MAINNET,
  });

  if (!destinationAxelarNetworkName || !axelarNetworkName) {
    throw new Error('Unsupported axelar networks');
  }

  const estimatedValue = (await axelarSdk.estimateGasFee(
    axelarNetworkName,
    destinationAxelarNetworkName,
    160_000,
    'auto',
  )) as string;

  const tx = await its.interchainTransfer(
    mTokenAddresses.axelar.tokenId,
    destinationAxelarNetworkName,
    destinationAddress,
    amount,
    '0x',
    estimatedValue,
    {
      value: estimatedValue,
      gasLimit: 1_000_000,
    },
  );

  logDeploy('Bridge tx', undefined, tx.hash);

  return tx.hash;
};
