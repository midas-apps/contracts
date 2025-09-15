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
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: (await adapter.factoryAdapter
          .connect((await hre.ethers.getSigners())[0])
          .deploy(adapter.address)) as Contract & ChainlinkAdapterBase,
        contract: new Contract(
          adapter.address,
          adapter.contractAbi,
          hre.ethers.provider,
        ),
      };
    }) ?? [],
  );
};
