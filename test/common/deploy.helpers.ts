import { Contract } from 'ethers';
import { ethers } from 'hardhat';

/**
 * Deploys a contract as a proxy and returns the strongly-typed instance.
 * @param contractName - The contract name as in artifacts
 * @param initializer - The initializer function name (default: 'initialize')
 * @param initParams - The initializer arguments
 */
export const deployProxyContract = async <
  TContract extends Contract = Contract,
>(
  contractName: string,
  initParams?: unknown[],
  initializer = 'initialize',
): Promise<TContract> => {
  console.log(`[dpc] Deploying ${contractName}`);
  const factory = await ethers.getContractFactory(contractName);
  const impl = await factory.deploy();
  await impl.deployed();
  console.log(`[dpc] Implementation deployed at: ${impl.address}`);

  const proxyFactory = await ethers.getContractFactory('ERC1967Proxy');
  const proxy = await proxyFactory.deploy(
    impl.address,
    factory.interface.encodeFunctionData(initializer, initParams),
  );
  await proxy.deployed();
  console.log(`[dpc] Proxy deployed at: ${proxy.address}\n`);

  const attached = factory.attach(proxy.address) as TContract;
  return attached;
};

/**
 * Deploys a contract as a proxy if the contract exists, otherwise returns null.
 * @param contractName - The contract name as in artifacts
 * @param initializer - The initializer function name (default: 'initialize')
 * @param initParams - The initializer arguments
 */
export const deployProxyContractIfExists = async <
  TContract extends Contract = Contract,
>(
  contractName: string,
  initializer = 'initialize',
  ...initParams: unknown[]
): Promise<TContract | null> => {
  let factory;
  try {
    factory = await ethers.getContractFactory(contractName);
  } catch {
    return null;
  }
  const impl = await factory.deploy();
  const proxy = await (
    await ethers.getContractFactory('ERC1967Proxy')
  ).deploy(
    impl.address,
    factory.interface.encodeFunctionData(initializer, initParams),
  );
  return factory.attach(proxy.address) as TContract;
};
