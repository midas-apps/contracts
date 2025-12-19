import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { BigNumberish, constants, ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
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
  PaymentTokenName,
} from '../../config';
import {
  getCurrentAddresses,
  midasAddressesPerNetwork,
} from '../../config/constants/addresses';
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

export const calculateCanonicalDeploySalt = async (
  hre: HardhatRuntimeEnvironment,
  tokenAddress: string,
) => {
  const itsFactory = await hre.ethers.getContractAt(
    axelarItsFactoryAbi,
    axelarItsFactoryAddress,
  );

  return await itsFactory.canonicalInterchainTokenDeploySalt(tokenAddress);
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

export const axelarInterchainTransferMToken = async (
  hre: HardhatRuntimeEnvironment,
  amount: number,
  {
    destinationNetwork,
    mToken,
    destinationAddress,
    customData,
    gasLimit,
  }: {
    mToken: MTokenName;
    destinationNetwork: Network;
    destinationAddress?: string;
    customData?: string;
    gasLimit?: BigNumberish;
  },
) => {
  return axelarInterchainTransfer(
    hre,
    amount,
    {
      destinationNetwork,
      destinationAddress,
      customData,
      gasLimit,
    },
    async () => {
      const addresses = getCurrentAddresses(hre);
      const mTokenAddresses = addresses?.[mToken];

      if (!mTokenAddresses?.axelar?.tokenId || !mTokenAddresses?.token) {
        throw new Error('Token addresses are not found');
      }

      return {
        approveRequired: false,
        axelarTokenId: mTokenAddresses?.axelar?.tokenId,
        tokenAddress: mTokenAddresses?.token,
      };
    },
  );
};

export const axelarInterchainTransferPToken = async (
  hre: HardhatRuntimeEnvironment,
  amount: number,
  {
    destinationNetwork,
    pToken,
    destinationAddress,
    customData,
    gasLimit,
  }: {
    pToken: PaymentTokenName;
    destinationNetwork: Network;
    destinationAddress?: string;
    customData?: string;
    gasLimit?: BigNumberish;
  },
) => {
  return axelarInterchainTransfer(
    hre,
    amount,
    {
      destinationNetwork,
      destinationAddress,
      customData,
      gasLimit,
    },
    async () => {
      const addresses = getCurrentAddresses(hre);
      const pTokenAddresses = addresses?.paymentTokens?.[pToken];

      if (!pTokenAddresses?.axelar?.tokenId || !pTokenAddresses?.token) {
        throw new Error('Token addresses are not found');
      }

      return {
        approveRequired: true,
        axelarTokenId: pTokenAddresses?.axelar?.tokenId,
        tokenAddress: pTokenAddresses?.token,
      };
    },
  );
};

const axelarInterchainTransfer = async (
  hre: HardhatRuntimeEnvironment,
  amount: number,
  {
    destinationNetwork,
    destinationAddress,
    gasLimit,
    customData,
  }: {
    destinationNetwork: Network;
    destinationAddress?: string;
    customData?: string;
    gasLimit?: BigNumberish;
  },
  callback: () => Promise<{
    approveRequired: boolean;
    axelarTokenId: string;
    tokenAddress: string;
  }>,
) => {
  const deployer = await getDeployer(hre);
  const its = await hre.ethers.getContractAt(
    axelarItsAbi,
    axelarItsAddress,
    deployer,
  );

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
    gasLimit ?? 160_000,
    'auto',
  )) as string;

  const { approveRequired, axelarTokenId, tokenAddress } = await callback();
  const erc20 = await hre.ethers.getContractAt('ERC20', tokenAddress);

  const amountParsed = parseUnits(amount.toString(), await erc20.decimals());

  if (approveRequired) {
    const tx = await erc20.approve(axelarItsAddress, amountParsed);
    logDeploy('Approve tx', undefined, tx.hash);
    await tx.wait(1);
  }

  const metadata = ethers.utils.solidityPack(
    ['uint32', 'bytes'],
    [0, customData ?? '0x'],
  );

  const tx = await its.interchainTransfer(
    axelarTokenId,
    destinationAxelarNetworkName,
    destinationAddress,
    amountParsed,
    metadata,
    estimatedValue,
    {
      value: estimatedValue,
    },
  );

  logDeploy('Bridge tx', undefined, tx.hash);

  await tx.wait(1);
  return tx.hash;
};

export const axelarInterchainTransferExecutable = async (
  hre: HardhatRuntimeEnvironment,
  type: 'deposit' | 'redeem',
  amount: number,
  {
    destinationNetwork,
    receiverAddress,
    referrerId,
    mToken,
    pToken,
  }: {
    destinationNetwork: Network;
    receiverAddress: string;
    referrerId?: string;
    mToken: MTokenName;
    pToken: PaymentTokenName;
  },
) => {
  const hubExecutable = Object.entries(midasAddressesPerNetwork)
    .map(([k, v]) => [k, v?.[mToken]?.axelar?.executables?.[pToken]])
    .find(([k, v]) => v !== undefined);

  if (!hubExecutable) {
    throw new Error('Hub executable is not found');
  }

  const desitnationNetworkAxelarNetworkName =
    axelarChainNames[destinationNetwork];

  if (!desitnationNetworkAxelarNetworkName) {
    throw new Error('Unsupported destination network');
  }

  const gasLimit = 1_000_000;

  if (type === 'deposit') {
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['bytes', 'uint256', 'bytes32', 'string'],
      [
        receiverAddress,
        0,
        referrerId ?? constants.HashZero,
        desitnationNetworkAxelarNetworkName,
      ],
    );

    return axelarInterchainTransferPToken(hre, amount, {
      destinationNetwork: hubExecutable[0] as Network,
      pToken,
      destinationAddress: hubExecutable[1],
      customData: encodedData,
      gasLimit,
    });
  } else {
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['bytes', 'uint256', 'string'],
      [receiverAddress, 0, desitnationNetworkAxelarNetworkName],
    );
    return axelarInterchainTransferMToken(hre, amount, {
      destinationNetwork: hubExecutable[0] as Network,
      mToken,
      destinationAddress: hubExecutable[1],
      customData: encodedData,
      gasLimit,
    });
  }
};
