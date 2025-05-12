import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import { ethers } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, MTokenNameEnum } from '../config';

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const isMTokenName = (name: string): name is MTokenName => {
  return Object.values(MTokenNameEnum).includes(name as MTokenNameEnum);
};

export const getMTokenOrThrow = (hre: HardhatRuntimeEnvironment) => {
  const mToken = hre.mtoken;
  if (!mToken) {
    throw new Error('MToken parameter not found');
  }
  return mToken;
};

export const getImplAddressFromProxy = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
): Promise<string> =>
  await getImplementationAddress(hre.ethers.provider, proxyAddress);

export const logDeploy = (
  contractName: string,
  contractType: string | undefined,
  address: string,
) =>
  console.info(
    `\x1b[32m${contractName}\x1b[0m${contractType ? ' ' : ''}${
      contractType ?? ''
    }:\t`,
    '\x1b[36m',
    address,
    '\x1b[0m',
  );

export const etherscanVerify = async (
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  ...constructorArguments: unknown[]
) => {
  const network = hre.network.name;
  if (network === 'localhost' || network === 'hardhat') return;
  await verify(hre, contractAddress, ...constructorArguments);
};

export const etherscanVerifyImplementation = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ...constructorArguments: unknown[]
) => {
  const contractAddress = await getImplAddressFromProxy(hre, proxyAddress);
  return etherscanVerify(hre, contractAddress, ...constructorArguments);
};

export const logDeployProxy = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  address: string,
) => {
  logDeploy(contractName, 'Proxy', address);

  try {
    logDeploy(
      contractName,
      'Impl',
      await getImplAddressFromProxy(hre, address),
    );
  } catch (err) {
    console.error('Log impl error. ', err);
  }
};

export const tryEtherscanVerifyImplementation = async (
  hre: HardhatRuntimeEnvironment,
  proxyAddress: string,
  ...constructorArguments: unknown[]
) => {
  return await etherscanVerifyImplementation(
    hre,
    proxyAddress,
    ...constructorArguments,
  )
    .catch((err) => {
      console.error('Unable to verify. Error: ', err);
      return false;
    })
    .then(() => {
      return true;
    });
};

export const verify = async (
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...constructorArguments: any[]
) => {
  console.log('Arguments: ', constructorArguments);

  await hre.run('verify:verify', {
    address: contractAddress,
    constructorArguments,
  });
};

export const encodeFnSelector = (selector: string) =>
  ethers.utils.id(selector).substring(0, 10);
