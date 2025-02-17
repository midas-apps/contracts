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
  mEDGE?: TokenAddresses;
  mRE7?: TokenAddresses;
  mMEV?: TokenAddresses;
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
    mEDGE: {
      token: '0xbB51E2a15A9158EBE2b0Ceb8678511e063AB7a55',
      customFeed: '0x698dA5D987a71b68EbF30C1555cfd38F190406b7',
      dataFeed: '0x20cd58F72cF1727a2937eB1816593390cf8d91cB',
      depositVault: '0xfE8de16F2663c61187C1e15Fb04D773E6ac668CC',
      redemptionVaultSwapper: '0x9B2C5E30E3B1F6369FC746A1C1E47277396aF15D',
    },
    mMEV: {
      token: '0x030b69280892c888670EDCDCD8B69Fd8026A0BF3',
      customFeed: '0x5f09Aff8B9b1f488B7d1bbaD4D89648579e55d61',
      dataFeed: '0x9BF00b7CFC00D6A7a2e2C994DB8c8dCa467ee359',
      depositVault: '0xE092737D412E0B290380F9c8548cB5A58174704f',
      redemptionVaultSwapper: '0xac14a14f578C143625Fc8F54218911e8F634184D',
    },
    mRE7: {
      token: '0x87C9053C819bB28e0D73d33059E1b3DA80AFb0cf',
      customFeed: '0x0a2a51f2f206447dE3E3a80FCf92240244722395',
      dataFeed: '0x7E8C632ab231479886AF1Bc02B9D646e4634Da93',
      depositVault: '0xcE0A2953a5d46400Af601a9857235312d1924aC7',
      redemptionVaultSwapper: '0x5356B8E06589DE894D86B24F4079c629E8565234',
    },
    eUSD: {
      token: '0xb5C5f2f9d9d9e7c2E885549AFb857306d119c701',
      depositVault: '0xdD2EC1Da19950B6B836D46882897D0D8fe4cF487',
      redemptionVault: '0x672DCEE688aa1685701a4A4138CB20d07272D116',
    },
  },
  base: {
    dataFeeds: {
      usdc: {
        token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        aggregator: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
        dataFeed: '0x6390b84321663d6fB1C911077d1CB97a7114dc56',
      },
    },
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
    mEDGE: {
      token: '0x4089dC8b6637218f13465d28950A82a7E90cBE27',
      customFeed: '0x672DCEE688aa1685701a4A4138CB20d07272D116',
      dataFeed: '0xA7aB67Aa19F6b387BA12FcEdB6d1447E0c25897c',
      depositVault: '0x2fD18B0878967E19292E9a8BF38Bb1415F6ad653',
      redemptionVaultSwapper: '0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847',
    },
    mRE7: {
      token: '0x8459f6e174deE33FC72BDAE74a3080751eC92c27',
      customFeed: '0xDd5a54bA2aB379A5e642c58F98aD793A183960E2',
      dataFeed: '0x54D4783F47889c73861152F027A1AEdf75d439d0',
      depositVault: '0x263A7AcE5E77986b77DcA125859248fEED52383c',
      redemptionVaultSwapper: '0x25D30cF795602e807d2038c1326Ad6643F822cEA',
    },
    mMEV: {
      token: '0x141f0E9ed8bA2295254C9DF9476ccE7bC29172B1',
      customFeed: '0x2bdaEfA3026a8f9eb7B80d03904752944239E8E9',
      dataFeed: '0x2E0357e38FC7fAE9C29050AEf3744D4055490adA',
      depositVault: '0x3aAc6fd73fA4e16Ec683BD4aaF5Ec89bb2C0EdC2',
      redemptionVaultSwapper: '0xa8a5c4FF4c86a459EBbDC39c5BE77833B3A15d88',
    },
  },
  oasis: {
    dataFeeds: {
      usdc: {
        token: '0x97eec1c29f745dC7c267F90292AA663d997a601D',
        aggregator: '0xa97522073dDfe39e31e606338a5Df433291DE238',
        dataFeed: '0xfB8b388c6D02168E7cD2f15bE82a78DB3d58ef3C',
      },
    },
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    mTBILL: {
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      customFeed: '0xF76d11D4473EA49a420460B72798fc3B38D4d0CF',
      dataFeed: '0x1075762cb143B495dbccE139712add38Eff19dAb',
      depositVault: '0xD7Fe0e91C05CAfdd26dA4B176eEc2b883795BDcC',
      redemptionVault: '0xf939E88ecAd43115116c7106DfdbdC4b1315a7Ee',
    },
  },
  plume: {
    dataFeeds: {
      pusd: {
        aggregator: '0xE398B6C1E3B6cfc9204a4eCce200f2A90A4845db',
        token: '0xdddD73F5Df1F0DC31373357beAC77545dC5A6f3F',
        dataFeed: '0x7588139737f32A6da49b9BB03A0a91a45603b45F',
      },
    },
    mBASIS: {
      token: '0x27E572586Db60e2d4d9d32bAC43a73B0aCE7884A',
    },
    mEDGE: {
      token: '0x2BF237b9e35d281DCD81eF4B20E07Dd679E598C3',
      customFeed: '0xec39305dE263275DF65F1BD6D209Baf9c8711560',
      dataFeed: '0x1e8861d7372F661844acc0025681936f190C6016',
      depositVault: '0x51229E6A95ea251432cA5c695704deB4D18D19B9',
      redemptionVaultSwapper: '0x9B0d0bDAE237116F711E8C9d900B5dDCC8eF8B5D',
    },
    accessControl: '0xd1871c36560539f010C548c702C67F397CD97d27',
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
      pusd: {
        token: '0xA48CfD53263ADe6abDb0ac75287Cc0d5A2EEE17F',
        aggregator: '0xC9D25E1A356dBDAa6956f79c695BbC338825B276',
        dataFeed: '0x0f50b401509798F1919a4e8D38192F78734e49C0',
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
    mEDGE: {
      token: '0x1FE17936c1CdC73c857263997716e3A60B9291C7',
      customFeed: '0x57DA0556F85Aa7e59B8053A2929B759236dfE27E',
      dataFeed: '0x164645fbC7220a3b4f8f5C6B473bCf1b6db146DD',
      depositVault: '0x5463A2651cea746606ABf3FAe10EfABE7ce06912',
      redemptionVaultSwapper: '0xf51ad2f863FB9728231a234DFC7574463317A237',
    },
    mMEV: {
      token: '0x8335d94170C4275EbeE7c0Ff8AD3F4C0752eCe2d',
      customFeed: '0x5AD2e3d65f8eCDc36eeba38BAE3Cc6Ff258D2dfa',
      dataFeed: '0xFaAE52c6A6d477f859a740a76B29c33559ace18c',
      depositVault: '0xa1150cd4A014e06F5E0A6ec9453fE0208dA5adAb',
      redemptionVaultSwapper: '0xEA6a495bA398FAE5f9780335FE27f33E6cCC995E',
    },
    mRE7: {
      token: '0xC93bb8D5581D74272F0E304593af9Ab4E3A0181b',
      customFeed: '0xE042678e6c6871Fa279e037C11e390f31334ba0B',
      dataFeed: '0x6b6b870C7f449266a9F40F94eCa5A6fF9b0857E4',
      depositVault: '0x65C4e04Cc26aAdd1eC95C54Cd6dBa61a270F15ca',
      redemptionVaultSwapper: '0x5A096AC89eaEF68930352a15Da49e4eB8590Bf1d',
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
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    mTBILL: {
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
    },
    mBASIS: {
      token: '0x2247B5A46BB79421a314aB0f0b67fFd11dd37Ee4',
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
