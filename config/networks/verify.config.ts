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
  hyperevm: {
    type: 'etherscan',
    browserUrl: 'https://hyperevmscan.io',
  },
  scroll: {
    type: 'etherscan',
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
    type: 'custom',
    apiUrl: '',
    browserUrl: '',
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
    apiUrl: 'https://rootstock.custom.com/api/',
    browserUrl: 'https://rootstock.custom.com/',
  },
  tacTestnet: {
    type: 'custom',
    apiUrl: 'https://turin.explorer.tac.build/api',
    browserUrl: 'https://turin.explorer.tac.build',
  },
  katana: {
    type: 'custom',
    apiUrl: 'https://explorer.katanarpc.com/api',
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
    type: 'custom',
    apiUrl:
      'https://api.routescan.io/v2/network/mainnet/evm/9745/etherscan/api',
    browserUrl: 'https://plasmascan.to',
  },
  bsc: {
    type: 'custom',
    apiUrl: 'https://api.bscscan.com/api',
    browserUrl: 'https://bscscan.com',
  },
  injective: {
    type: 'custom',
    apiUrl: 'https://custom-api.injective.network/api',
    browserUrl: 'https://custom.injective.network',
  },
  optimism: {
    type: 'etherscan',
    browserUrl: 'https://optimistic.etherscan.io',
  },
};
