import { getAddress } from 'ethers/lib/utils';

import { ConfigPerNetwork, Network } from '../../../config';
import {
  getBandAdapters,
  getBeHypeAdapters,
  getERC4626Adapters,
  getMantleLspStakingAdapters,
  getPythAdapters,
  getRsEthAdapters,
  getStorkAdapters,
  getSyrupAdapters,
  getWrappedEEthAdapters,
  getWstEthAdapters,
  NetworkAdapterConfig,
} from '../helpers/adapters-helpers';

export const forkingBlocks: Partial<ConfigPerNetwork<number>> = {};

export const ethereumAdaptersConfig: NetworkAdapterConfig = {
  syrupAdapters: [
    {
      name: 'syrupUSDC',
      address: getAddress('0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b'),
    },
  ],
  mantleLspStakingAdapters: [
    {
      lspStaking: getAddress('0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f'),
      name: 'Mantle LSP Staking',
    },
  ],
  rsEthAdapters: [
    {
      rsEth: getAddress('0x349A73444b1a310BAe67ef67973022020d70020d'),
      name: 'rsETH',
    },
  ],
  wrappedEEthAdapters: [
    {
      wrappedEEth: getAddress('0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee'),
      name: 'Wrapped EEth',
    },
  ],
  wstEthAdapters: [
    {
      wstEth: getAddress('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'),
      name: 'wstETH',
    },
  ],
  erc4626Adapters: [
    {
      vault: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      name: 'Staked USDe',
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
  beHypeAdapters: [
    {
      beHype: getAddress('0xCeaD893b162D38e714D82d06a7fe0b0dc3c38E0b'), // FIXME:,
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
  beHypeAdapters: Awaited<ReturnType<typeof getBeHypeAdapters>>;
  mantleLspStakingAdapters: Awaited<
    ReturnType<typeof getMantleLspStakingAdapters>
  >;
  rsEthAdapters: Awaited<ReturnType<typeof getRsEthAdapters>>;
  wrappedEEthAdapters: Awaited<ReturnType<typeof getWrappedEEthAdapters>>;
  wstEthAdapters: Awaited<ReturnType<typeof getWstEthAdapters>>;
  storkAdapters: Awaited<ReturnType<typeof getStorkAdapters>>;
  pythAdapters: Awaited<ReturnType<typeof getPythAdapters>>;
  erc4626Adapters: Awaited<ReturnType<typeof getERC4626Adapters>>;
}>;

export const defaultAdaptersFixture = async (
  network: Network,
): ReturnType<AdaptersNetworkFixture> => {
  const config = configsPerNetwork[network];

  const syrupAdapters = await getSyrupAdapters(config?.syrupAdapters);
  const bandAdapters = await getBandAdapters(config?.bandAdapters);
  const beHypeAdapters = await getBeHypeAdapters(config?.beHypeAdapters);
  const mantleLspStakingAdapters = await getMantleLspStakingAdapters(
    config?.mantleLspStakingAdapters,
  );
  const rsEthAdapters = await getRsEthAdapters(config?.rsEthAdapters);
  const wrappedEEthAdapters = await getWrappedEEthAdapters(
    config?.wrappedEEthAdapters,
  );
  const wstEthAdapters = await getWstEthAdapters(config?.wstEthAdapters);
  const storkAdapters = await getStorkAdapters(config?.storkAdapters);
  const pythAdapters = await getPythAdapters(config?.pythAdapters);
  const erc4626Adapters = await getERC4626Adapters(config?.erc4626Adapters);
  return {
    syrupAdapters,
    bandAdapters,
    beHypeAdapters,
    mantleLspStakingAdapters,
    rsEthAdapters,
    wrappedEEthAdapters,
    wstEthAdapters,
    storkAdapters,
    pythAdapters,
    erc4626Adapters,
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
