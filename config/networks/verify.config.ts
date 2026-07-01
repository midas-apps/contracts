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
      overrideApiUrl: 'https://sourcify-api-monad.blockvision.org',
      browserUrl: 'https://repo.sourcify.dev',
    },
  ],
  oasis: {
    // Oasis Sapphire does not expose an Etherscan-compatible API.
    // Official docs (docs.oasis.io) mandate Sourcify for contract verification.
    // browserUrl uses repo.sourcify.dev — see xrplevm comment for reasoning.
    type: 'sourcify',
    overrideApiUrl: 'https://sourcify.dev/server',
    browserUrl: 'https://repo.sourcify.dev',
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
    // explorer.xrplevm.org is Blockscout-based.
    // Using Sourcify avoids the hardhat-verify v2 bug where object-style apiKey
    // causes customChains apiURL to be overridden by the hardcoded Etherscan v2
    // endpoint, causing verification to fail for non-Etherscan chains.
    // overrideApiUrl pins to the standard Sourcify server and prevents
    // SOURCIFY_API_URL from the .env (currently the Monad-specific instance)
    // from being used here.
    // browserUrl uses repo.sourcify.dev because hardhat-verify appends
    // /contracts/full_match/{chainId}/{address}/ — that path is only served
    // by the Sourcify repo, not by the Blockscout explorer.
    type: 'sourcify',
    overrideApiUrl: 'https://sourcify.dev/server',
    browserUrl: 'https://repo.sourcify.dev',
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
  robinhood: {
    type: 'custom',
    browserUrl: '',
    apiUrl: '',
  },
};
