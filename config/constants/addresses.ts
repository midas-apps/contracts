import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ConfigPerNetwork } from '../types/index';

type TokenAddresses = {
  customFeed?: string;
  dataFeed?: string;
  token?: string;
  depositVault?: string;
  redemptionVault?: string;
  redemptionVaultBuidl?: string;
  redemptionVaultSwapper?: string;
};
export interface MidasAddresses {
  mTBILL?: TokenAddresses;
  mBASIS?: TokenAddresses;
  mBTC?: TokenAddresses;
  eUSD?: TokenAddresses;
  etfDataFeed?: string;
  eurToUsdFeed?: string;
  accessControl?: string;
  dataFeeds?: Record<
    string,
    {
      token?: string;
      dataFeed?: string;
      aggregator?: string;
    }
  >;
}

export const midasAddressesPerNetwork: ConfigPerNetwork<
  MidasAddresses | undefined
> = {
  main: {
    dataFeeds: {
      usdt: {
        aggregator: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
        token: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        dataFeed: '0x7811C1Bf5db28630F303267Cc613797EB9A81188',
      },
      usdc: {
        aggregator: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dataFeed: '0x3aAc6fd73fA4e16Ec683BD4aaF5Ec89bb2C0EdC2',
      },
      dai: {
        aggregator: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
        token: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        dataFeed: '0xeDBA9943FC91983D1BF53d6F8Af346a5E162747D',
      },
      wbtc: {
        aggregator: '0xfdFD9C85aD200c506Cf9e21F1FD8dd01932FBB23',
        token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        dataFeed: '0x488F2Ab54fEeF6B4431834d34126e103cE573796',
      },
      m: {
        aggregator: '0x77E7d36CA1649183aabd90E8dB738925f2f9C32c',
        token: '0x866A2BF4E572CbcF37D5071A7a58503Bfb36be1b',
        dataFeed: '0x1C04A3f615CD594088482be77df6e077EEebF085',
      },
    },
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    // TODO: remove this data feed
    etfDataFeed: '0xc747FdDFC46CDC915bEA866D519dFc5Eae5c947f',
    eurToUsdFeed: '0x6022a020Ca5c611304B9E97F37AEE0C38455081A',
    mTBILL: {
      dataFeed: '0xfCEE9754E8C375e145303b7cE7BEca3201734A2B',
      customFeed: '0x056339C044055819E8Db84E71f5f2E1F536b2E5b',
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      depositVault: '0x99361435420711723aF805F08187c9E6bF796683',
      redemptionVault: '0xF6e51d24F4793Ac5e71e0502213a9BBE3A6d4517',
      redemptionVaultBuidl: '0x569D7dccBF6923350521ecBC28A555A500c4f0Ec',
    },
    mBASIS: {
      dataFeed: '0x1615cBC603192ae8A9FF20E98dd0e40a405d76e4',
      customFeed: '0xE4f2AE539442e1D3Fb40F03ceEbF4A372a390d24',
      token: '0x2a8c22E3b10036f3AEF5875d04f8441d4188b656',
      depositVault: '0xa8a5c4FF4c86a459EBbDC39c5BE77833B3A15d88',
      redemptionVault: '0x19AB19e61A930bc5C7B75Bf06cDd954218Ca9F0b',
      redemptionVaultSwapper: '0x0D89C1C4799353F3805A3E6C4e1Cbbb83217D123',
    },
    mBTC: {
      token: '0x007115416AB6c266329a03B09a8aa39aC2eF7d9d',
      customFeed: '0xA537EF0343e83761ED42B8E017a1e495c9a189Ee',
      dataFeed: '0x9987BE0c1dc5Cd284a4D766f4B5feB4F3cb3E28e',
      depositVault: '0x10cC8dbcA90Db7606013d8CD2E77eb024dF693bD',
      redemptionVault: '0x30d9D1e76869516AEa980390494AaEd45C3EfC1a',
    },
    eUSD: {
      token: '0xb5C5f2f9d9d9e7c2E885549AFb857306d119c701',
      depositVault: '0xdD2EC1Da19950B6B836D46882897D0D8fe4cF487',
      redemptionVault: '0x672DCEE688aa1685701a4A4138CB20d07272D116',
    },
  },
  base: {
    accessControl: '0x0312a9d1ff2372ddedcbb21e4b6389afc919ac4b',
    mTBILL: {
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      customFeed: '0x70E58b7A1c884fFFE7dbce5249337603a28b8422',
      dataFeed: '0xcbCf1e67F1988e2572a2A620321Aef2ff73369f0',
      depositVault: '0x8978e327FE7C72Fa4eaF4649C23147E279ae1470',
      redemptionVault: '0x2a8c22E3b10036f3AEF5875d04f8441d4188b656',
    },
    mBASIS: {
      token: '0x1C2757c1FeF1038428b5bEF062495ce94BBe92b2',
      customFeed: '0x6d62D3C3C8f9912890788b50299bF4D2C64823b6',
      dataFeed: '0xD48D38Ec56CDB44c4281068129038A37F5Df04e5',
      depositVault: '0x80b666D60293217661E7382737bb3E42348f7CE5',
      redemptionVaultSwapper: '0xF804a646C034749b5484bF7dfE875F6A4F969840',
    },
  },
  sepolia: {
    dataFeeds: {
      usdc: {
        dataFeed: '0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847',
        aggregator: '0x7811C1Bf5db28630F303267Cc613797EB9A81188',
        token: '0xF55588f2f8CF8E1D9C702D169AF43c15f5c85f12',
      },
      usdt: {
        dataFeed: '0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847',
        aggregator: '0x7811C1Bf5db28630F303267Cc613797EB9A81188',
        token: '0xEa22F8C1624c17C1B58727235292684831A08d56',
      },
      wbtc: {
        token: '0xa7c6c173D38DCf0543B5C479B845a430529A9a96',
        aggregator: '0x798910CBbE311E14C3B61301b3bCb76a3348A6fb',
        dataFeed: '0xaa7BeE2d7dE06cB4E30564323Fb17C5029e7D567',
      },
    },
    mTBILL: {
      dataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
      customFeed: '0x5CB155D19696ED296dc4942BEDB6EEc69367c332',
      depositVault: '0x1615cBC603192ae8A9FF20E98dd0e40a405d76e4',
      redemptionVault: '0x2fD18B0878967E19292E9a8BF38Bb1415F6ad653',
      redemptionVaultBuidl: '0x6B35F2E4C9D4c1da0eDaf7fd7Dc90D9bCa4b0873',
      token: '0xefED40D1eb1577d1073e9C4F277463486D39b084',
    },
    mBASIS: {
      customFeed: '0x263A7AcE5E77986b77DcA125859248fEED52383c',
      dataFeed: '0x3aAc6fd73fA4e16Ec683BD4aaF5Ec89bb2C0EdC2',
      token: '0x4089dC8b6637218f13465d28950A82a7E90cBE27',
      depositVault: '0xE1998045AD0cFd38aBd274f2E1A4abA4278e2288',
      redemptionVault: '0xF6e51d24F4793Ac5e71e0502213a9BBE3A6d4517',
      redemptionVaultSwapper: '0x460cec7f88e7813D7b0a297160e6718D9fE33908',
      // swapper with regular mTBILL rv: 0x3897445701132efb82362324D59D0f35c23B0170
    },
    mBTC: {
      customFeed: '0x22Ee16244Db2504dbdCb6f4F1F3e154886630854',
      dataFeed: '0x0136E7F79b13E918FA6786f6D1ebC59e273773Cc',
      token: '0xB14561FcC3100EBFD4024D1B1060B0b3b3a9a3D7',
      depositVault: '0x156f6Eb2E8fa8F72f53aceBB839bF9728657Ce8E',
      redemptionVault: '0x307267989A7bec3A57FD7fd96017C49803589Fd0',
    },
    eUSD: {
      token: '0xDd5a54bA2aB379A5e642c58F98aD793A183960E2',
      depositVault: '0x056339C044055819E8Db84E71f5f2E1F536b2E5b',
      redemptionVault: '0xE4f2AE539442e1D3Fb40F03ceEbF4A372a390d24',
    },
    etfDataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
    eurToUsdFeed: '0xE23c07Ecad6D822500CbE8306d72A90578CA9F11',
    accessControl: '0xbf25b58cB8DfaD688F7BcB2b87D71C23A6600AaC',
  },
  hardhat: undefined,
  etherlink: {
    accessControl: '0xa8a5c4FF4c86a459EBbDC39c5BE77833B3A15d88',
    eUSD: {
      token: '0x19AB19e61A930bc5C7B75Bf06cDd954218Ca9F0b',
      redemptionVault: '0x0D89C1C4799353F3805A3E6C4e1Cbbb83217D123',
    },
  },
  localhost: {
    dataFeeds: {
      usdt: {
        aggregator: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
        token: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        dataFeed: '0x7811C1Bf5db28630F303267Cc613797EB9A81188',
      },
      usdc: {
        aggregator: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
        token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        dataFeed: '0x3aAc6fd73fA4e16Ec683BD4aaF5Ec89bb2C0EdC2',
      },
    },
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    // TODO: remove this data feed
    etfDataFeed: '0xc747FdDFC46CDC915bEA866D519dFc5Eae5c947f',
    eurToUsdFeed: '0x6022a020Ca5c611304B9E97F37AEE0C38455081A',
    mTBILL: {
      dataFeed: '0xfCEE9754E8C375e145303b7cE7BEca3201734A2B',
      customFeed: '0x056339C044055819E8Db84E71f5f2E1F536b2E5b',
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      depositVault: '0x99361435420711723aF805F08187c9E6bF796683',
      redemptionVault: '0x8978e327FE7C72Fa4eaF4649C23147E279ae1470',
    },
    mBASIS: {
      dataFeed: '0x1615cBC603192ae8A9FF20E98dd0e40a405d76e4',
      customFeed: '0xE4f2AE539442e1D3Fb40F03ceEbF4A372a390d24',
      token: '0x2a8c22E3b10036f3AEF5875d04f8441d4188b656',
      depositVault: '0x27C0D44B02E1B732F37ba31C466a35053A7780B8',
      redemptionVault: '0x73cB9a00cEB8FC9134a46eEE20D1fd00BEEe9D84',
    },
    eUSD: {
      token: '0xb5C5f2f9d9d9e7c2E885549AFb857306d119c701',
      depositVault: '0xdD2EC1Da19950B6B836D46882897D0D8fe4cF487',
      redemptionVault: '0x672DCEE688aa1685701a4A4138CB20d07272D116',
    },
  },
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (midasAddressesPerNetwork as any)[hre.network.name] as
    | MidasAddresses
    | undefined;
};
