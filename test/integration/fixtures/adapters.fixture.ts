import { getAddress } from 'ethers/lib/utils';
import hre from 'hardhat';

import { ConfigPerNetwork, Network } from '../../../config';
import { forkNetwork } from '../../../helpers/utils';
import {
  BeHypeChainlinkAdapter__factory,
  IBeHype__factory,
  IWrappedEEth__factory,
  MantleLspStakingChainlinkAdapter__factory,
  WstEthChainlinkAdapter__factory,
  IRsEth__factory,
  IWstEth__factory,
  WrappedEEthChainlinkAdapter__factory,
  RsEthChainlinkAdapter__factory,
  IMantleLspStaking__factory,
} from '../../../typechain-types';
import {
  getBandAdapters,
  getERC4626Adapters,
  getPythAdapters,
  getSingleAddressAdapters,
  getStorkAdapters,
  getSyrupAdapters,
  NetworkAdapterConfig,
} from '../helpers/adapters-helpers';

export const forkingBlocks: Partial<ConfigPerNetwork<number>> = {};

export const ethereumAdaptersConfig: NetworkAdapterConfig = {
  syrupAdapters: [
    {
      name: 'syrupUSDC',
      address: getAddress('0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b'),
    },
    {
      name: 'syrupUSDT',
      address: getAddress('0x356B8d89c1e1239Cbbb9dE4815c39A1474d5BA7D'),
    },
  ],
  erc4626Adapters: [
    {
      vault: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      name: 'Staked USDe',
    },
  ],
  singleAddressAdapters: [
    {
      address: getAddress('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'),
      name: 'wstETH',
      factoryAdapter: new WstEthChainlinkAdapter__factory(),

      contractAbi: IWstEth__factory.abi,
      fnToCall: 'stEthPerToken',
      storageVariable: 'wstEth',
    },
    {
      address: getAddress('0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee'),
      name: 'Wrapped EEth',
      factoryAdapter: new WrappedEEthChainlinkAdapter__factory(),

      contractAbi: IWrappedEEth__factory.abi,
      fnToCall: 'getRate',
      storageVariable: 'wrappedEEth',
    },
    {
      address: getAddress('0x349A73444b1a310BAe67ef67973022020d70020d'),
      name: 'rsETH',
      factoryAdapter: new RsEthChainlinkAdapter__factory(),

      contractAbi: IRsEth__factory.abi,
      fnToCall: 'rsETHPrice',
      storageVariable: 'rsEth',
    },
    {
      address: getAddress('0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f'),
      name: 'Mantle LSP Staking',
      factoryAdapter: new MantleLspStakingChainlinkAdapter__factory(),

      contractAbi: IMantleLspStaking__factory.abi,
      fnToCall: 'mETHToETH',
      storageVariable: 'lspStaking',
    },
  ],
};

export const oasisAdaptersConfig: NetworkAdapterConfig = {
  bandAdapters: [
    {
      ref: getAddress('0xDA7a001b254CD22e46d3eAB04d937489c93174C3'),
      base: 'USDC',
      quote: 'USD',
    },
  ],
};

export const hyperevmAdaptersConfig: NetworkAdapterConfig = {
  singleAddressAdapters: [
    {
      address: getAddress('0xCeaD893b162D38e714D82d06a7fe0b0dc3c38E0b'),
      factoryAdapter: new BeHypeChainlinkAdapter__factory(),

      contractAbi: IBeHype__factory.abi,
      fnToCall: 'BeHYPEToHYPE',
      storageVariable: 'beHype',
      name: 'beHYPE',
    },
  ],
  pythAdapters: [
    {
      pyth: getAddress('0xe9d69CdD6Fe41e7B621B4A688C5D1a68cB5c8ADc'),
      priceId:
        '0x1497fb795ae65533d36d147b1b88c8b7226866a201589904c13acd314f694799',
      name: 'USDHL/USD',
    },
  ],
};

export const plumeAdaptersConfig: NetworkAdapterConfig = {
  storkAdapters: [
    {
      stork: getAddress('0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62'),
      priceId:
        '0xe78fbac639b951bb7d4d8a6a7e4e3be7be423f4056b225ec071544c48dc303ef',
      name: 'PUSD/USD',
    },
  ],
};

export type AdaptersNetworkFixture = () => Promise<{
  syrupAdapters: Awaited<ReturnType<typeof getSyrupAdapters>>;
  bandAdapters: Awaited<ReturnType<typeof getBandAdapters>>;
  storkAdapters: Awaited<ReturnType<typeof getStorkAdapters>>;
  pythAdapters: Awaited<ReturnType<typeof getPythAdapters>>;
  erc4626Adapters: Awaited<ReturnType<typeof getERC4626Adapters>>;
  singleAddressAdapters: Awaited<ReturnType<typeof getSingleAddressAdapters>>;
}>;

export const defaultAdaptersFixture = async (
  network: Network,
): ReturnType<AdaptersNetworkFixture> => {
  await forkNetwork(hre, network);

  const config = configsPerNetwork[network];

  const syrupAdapters = await getSyrupAdapters(config?.syrupAdapters);
  const bandAdapters = await getBandAdapters(config?.bandAdapters);
  const storkAdapters = await getStorkAdapters(config?.storkAdapters);
  const pythAdapters = await getPythAdapters(config?.pythAdapters);
  const erc4626Adapters = await getERC4626Adapters(config?.erc4626Adapters);
  const singleAddressAdapters = await getSingleAddressAdapters(
    config?.singleAddressAdapters,
  );
  return {
    syrupAdapters,
    bandAdapters,
    storkAdapters,
    pythAdapters,
    erc4626Adapters,
    singleAddressAdapters,
  };
};

export const getAdapterNetworkFixture = (network: Network) => {
  return (
    fixturePerNetwork[network] ?? defaultAdaptersFixture.bind(this, network)
  );
};

export const fixturePerNetwork: Partial<
  ConfigPerNetwork<AdaptersNetworkFixture>
> = {};

export const configsPerNetwork: Partial<
  ConfigPerNetwork<NetworkAdapterConfig>
> = {
  main: ethereumAdaptersConfig,
  oasis: oasisAdaptersConfig,
  hyperevm: hyperevmAdaptersConfig,
  plume: plumeAdaptersConfig,
};
