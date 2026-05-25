import { PartialConfigPerNetwork } from '../types';

type EtherscanVerifyConfig = {
  type: 'etherscan';
  overrideApiKey?: string;
  browserUrl: string;
};

type SourcifyVerifyConfig = {
  type: 'sourcify';
  browserUrl: string;
  overrideApiUrl?: string;
};

type CustomVerifyConfig = {
  type: 'custom';
  apiUrl: string;
  apiKey?: string;
  browserUrl: string;
};

type VerifyConfig =
  | EtherscanVerifyConfig
  | SourcifyVerifyConfig
  | CustomVerifyConfig;

type VerifyConfigPerNetwork = PartialConfigPerNetwork<
  VerifyConfig | VerifyConfig[]
>;

export const verifyConfig: VerifyConfigPerNetwork = {
  main: {
    type: 'etherscan',
    browserUrl: 'https://etherscan.io',
  },
  sepolia: {
    type: 'etherscan',
    browserUrl: 'https://sepolia.etherscan.io',
  },
  base: {
    type: 'etherscan',
    browserUrl: 'https://basescan.org',
  },
  arbitrum: {
    type: 'etherscan',
    browserUrl: 'https://arbiscan.io',
  },
  arbitrumSepolia: {
    type: 'etherscan',
    browserUrl: 'https://sepolia.arbiscan.io',
  },
  hyperevm: {
    type: 'etherscan',
    browserUrl: 'https://hyperevmscan.io',
  },
  scroll: {
    type: 'custom',
    apiUrl: 'https://scrollscan.com/api',
    browserUrl: 'https://scrollscan.com',
  },
  monad: [
    {
      type: 'etherscan',
      browserUrl: 'https://monadscan.com',
    },
    {
      type: 'sourcify',
      browserUrl: 'https://monadvision.com',
      overrideApiUrl: 'https://sourcify-api-monad.blockvision.org',
    },
  ],
  oasis: {
    type: 'sourcify',
    browserUrl: 'https://explorer.oasis.io/mainnet/sapphire',
  },
  plume: {
    type: 'custom',
    apiUrl: 'https://explorer.plume.org/api',
    browserUrl: 'https://explorer.plume.org',
  },
  etherlink: {
    type: 'custom',
    apiUrl: 'https://explorer.etherlink.com/api',
    browserUrl: 'https://explorer.etherlink.com',
  },
  rootstock: {
    type: 'custom',
    apiUrl: 'https://rootstock.blockscout.com/api',
    browserUrl: 'https://rootstock.blockscout.com',
  },
  tacTestnet: {
    type: 'custom',
    apiUrl: 'https://turin.explorer.tac.build/api',
    browserUrl: 'https://turin.explorer.tac.build',
  },
  katana: {
    type: 'etherscan',
    browserUrl: 'https://explorer.katanarpc.com',
  },
  xrplevm: {
    type: 'custom',
    apiUrl: 'https://explorer.xrplevm.org/api',
    browserUrl: 'https://explorer.xrplevm.org',
  },
  tac: {
    type: 'custom',
    apiUrl: 'https://explorer.tac.build/api',
    browserUrl: 'https://explorer.tac.build',
  },
  zerog: {
    type: 'custom',
    apiUrl: 'https://chainscan.0g.ai/open/api',
    browserUrl: 'https://chainscan.0g.ai',
  },
  plasma: {
    type: 'etherscan',
    browserUrl: 'https://plasmascan.to',
  },
  bsc: {
    type: 'etherscan',
    browserUrl: 'https://bscscan.com',
  },
  injective: {
    type: 'custom',
    apiUrl: 'https://blockscout-api.injective.network/api',
    browserUrl: 'https://blockscout.injective.network',
  },
  optimism: {
    type: 'etherscan',
    browserUrl: 'https://optimistic.etherscan.io',
  },
};
