import { JsonFragment } from '@ethersproject/abi';
import { Contract, ContractFactory } from 'ethers';
import hre from 'hardhat';

import { ChainlinkAdapterBase } from '../../../typechain-types';

export type NetworkAdapterConfig = {
  syrupAdapters?: {
    address: string;
    name: string;
  }[];
  bandAdapters?: {
    ref: string;
    base: string;
    quote: string;
  }[];
  storkAdapters?: {
    stork: string;
    priceId: string;
    name: string;
  }[];
  pythAdapters?: {
    pyth: string;
    priceId: string;
    name: string;
  }[];
  erc4626Adapters?: {
    vault: string;
    name: string;
  }[];
  singleAddressAdapters?: {
    address: string;
    name: string;
    factoryAdapter: ContractFactory;
    contractAbi: ReadonlyArray<JsonFragment>;
    fnToCall: string;
    storageVariable: string;
    mock?: {
      contractName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deployArgs?: any[];
    };
  }[];
};

export const getSyrupAdapters = async (
  adapters: NetworkAdapterConfig['syrupAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('SyrupChainlinkAdapter')
        ).deploy(adapter.address),
      };
    }) ?? [],
  );
};

export const getBandAdapterId = (
  adapter: NonNullable<NetworkAdapterConfig['bandAdapters']>[number],
) => {
  return `${adapter.base}/${adapter.quote}`;
};

export const getBandAdapters = async (
  adapters: NetworkAdapterConfig['bandAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        id: getBandAdapterId(adapter),
        adapter: await (
          await hre.ethers.getContractFactory('BandStdChailinkAdapter')
        ).deploy(adapter.ref, adapter.base, adapter.quote),
      };
    }) ?? [],
  );
};

export const getPythAdapters = async (
  adapters: NetworkAdapterConfig['pythAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('PythChainlinkAdapter')
        ).deploy(adapter.pyth, adapter.priceId),
      };
    }) ?? [],
  );
};

export const getStorkAdapters = async (
  adapters: NetworkAdapterConfig['storkAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('StorkChainlinkAdapter')
        ).deploy(adapter.stork, adapter.priceId),
      };
    }) ?? [],
  );
};

export const getERC4626Adapters = async (
  adapters: NetworkAdapterConfig['erc4626Adapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('ERC4626ChainlinkAdapter')
        ).deploy(adapter.vault),
      };
    }) ?? [],
  );
};

export const getSingleAddressAdapters = async (
  adapters: NetworkAdapterConfig['singleAddressAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (cfg) => {
      // if mock is set, deploy it and use that address as the "source contract"
      let sourceAddress = cfg.address;
      let sourceAbi = cfg.contractAbi;
      let sourceContract: Contract | undefined;

      if (cfg.mock) {
        const Mock = await hre.ethers.getContractFactory(cfg.mock.contractName);
        sourceContract = await Mock.deploy(...(cfg.mock.deployArgs ?? []));
        await sourceContract.deployed();

        sourceAddress = sourceContract.address;
        sourceAbi = cfg.contractAbi;
      }

      const signer = (await hre.ethers.getSigners())[0];

      const adapter = (await cfg.factoryAdapter
        .connect(signer)
        .deploy(sourceAddress)) as Contract & ChainlinkAdapterBase;

      const contract =
        sourceContract ??
        new Contract(sourceAddress, sourceAbi, hre.ethers.provider);

      return {
        ...cfg,
        adapter,
        contract,
      };
    }) ?? [],
  );
};
