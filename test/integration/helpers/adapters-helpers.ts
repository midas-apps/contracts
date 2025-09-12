import hre from 'hardhat';

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
  beHypeAdapters?: {
    beHype: string;
    name: string;
  }[];
  mantleLspStakingAdapters?: {
    lspStaking: string;
    name: string;
  }[];
  rsEthAdapters?: {
    rsEth: string;
    name: string;
  }[];
  wrappedEEthAdapters?: {
    wrappedEEth: string;
    name: string;
  }[];
  wstEthAdapters?: {
    wstEth: string;
    name: string;
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

export const getBeHypeAdapters = async (
  adapters: NetworkAdapterConfig['beHypeAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('BeHypeChainlinkAdapter')
        ).deploy(adapter.beHype),
      };
    }) ?? [],
  );
};

export const getMantleLspStakingAdapters = async (
  adapters: NetworkAdapterConfig['mantleLspStakingAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory(
            'MantleLspStakingChainlinkAdapter',
          )
        ).deploy(adapter.lspStaking),
      };
    }) ?? [],
  );
};

export const getRsEthAdapters = async (
  adapters: NetworkAdapterConfig['rsEthAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('RsEthChainlinkAdapter')
        ).deploy(adapter.rsEth),
      };
    }) ?? [],
  );
};

export const getWrappedEEthAdapters = async (
  adapters: NetworkAdapterConfig['wrappedEEthAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('WrappedEEthChainlinkAdapter')
        ).deploy(adapter.wrappedEEth),
      };
    }) ?? [],
  );
};

export const getWstEthAdapters = async (
  adapters: NetworkAdapterConfig['wstEthAdapters'],
) => {
  return await Promise.all(
    adapters?.map(async (adapter) => {
      return {
        ...adapter,
        adapter: await (
          await hre.ethers.getContractFactory('WstEthChainlinkAdapter')
        ).deploy(adapter.wstEth),
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
