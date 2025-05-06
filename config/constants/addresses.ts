import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ConfigPerNetwork, MTokenName } from '../types/index';

type TokenAddresses = {
  customFeed?: string;
  dataFeed?: string;
  token?: string;
  depositVault?: string;
  redemptionVault?: string;
  redemptionVaultBuidl?: string;
  redemptionVaultSwapper?: string;
};

export type DataFeedAddresses = {
  token?: string;
  dataFeed?: string;
  aggregator?: string;
};

export type MidasAddresses = Partial<Record<MTokenName, TokenAddresses>> & {
  // TODO: remove?
  eUSD?: TokenAddresses;
  accessControl?: string;
  dataFeeds?: Record<string, DataFeedAddresses>;
};

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
    mSL: {
      token: '0x76CC16608aA7Cd32631bb151801bb095313F7bbd',
      customFeed: '0x12570b84b633629b1DB532fD3420F34a30ACfc68',
      dataFeed: '0xbdc0304210972be75Fd2247838BFF2b64474f15c',
      depositVault: '0xD0Bbc3a811E3a3502A07B130346DCc4cc9355c95',
      redemptionVaultSwapper: '0x8Bee3870Ad8293dcE79E6f4cb049F7531Bd57c22',
    },
    TACmBTC: {
      token: '0x307267989A7bec3A57FD7fd96017C49803589Fd0',
      depositVault: '0xD1c5cBaBb367783FB6b40935c64512EF06cBB4f4',
      redemptionVault: '0xa7c6c173D38DCf0543B5C479B845a430529A9a96',
    },
    TACmEDGE: {
      token: '0xaa7BeE2d7dE06cB4E30564323Fb17C5029e7D567',
      redemptionVault: '0xa85b5Dd222A71602FcA40410bc1f158bff1fa458',
      depositVault: '0x8F382ae7BBdBEcda835D26CE3Ba64010EAEe1386',
    },
    TACmMEV: {
      token: '0xC2C26520256D5920B8aa1DA91F211222B2083B46',
      redemptionVault: '0x1A57Aba59d50b192F8440e205E3B8B885bE128cC',
      depositVault: '0x18f7f9f20C495a7F4868ba807c64a5D0a9EE8648',
    },
    eUSD: {
      token: '0xb5C5f2f9d9d9e7c2E885549AFb857306d119c701',
      depositVault: '0xdD2EC1Da19950B6B836D46882897D0D8fe4cF487',
      redemptionVault: '0x672DCEE688aa1685701a4A4138CB20d07272D116',
    },
  },
  arbitrum: {
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    dataFeeds: {
      usdc: {
        aggregator: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
        dataFeed: '0xf1fE2d3Ea52773BBA5FB13816B46C2A8dbce59ED',
        token: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      },
    },
    mTBILL: {
      token: '0xdd629e5241cbc5919847783e6c96b2de4754e438',
      customFeed: '0x45964181FA0Ecc8fFFd169499730FFD60fbe3308',
      dataFeed: '0x8B6Dd8573FF97C08dD731B0A55E51E897aBeD03E',
      depositVault: '0x643f73A6a3Ffc5d6C6Be7c97Cc30422763CFb1d0',
      redemptionVault: '0x8ac12d5B71e4f046459b67077F8704BA0a86F8F9',
    },
    mBASIS: {
      token: '0x2448Cf256192Ee8e122E52026758Ae28398AfB4F',
      customFeed: '0xbfAAdf20cFB858CD274FBC8027d5276E6a61A64B',
      dataFeed: '0xF675E328d4AAe03ca97a965fFa32498741Bc6947',
      depositVault: '0x01bfF1379CE9f0877141a18670d4214dFAf630bE',
      redemptionVaultSwapper: '0xE03cD34De0E47c67bF881dB22feAb83121B50cC3',
    },
    mEDGE: {
      token: '0x130F99c2396e02DBaaa4c1643B10e06EcFe7eDAB',
      customFeed: '0x5a4E7FC0e4b329d8c6C124e442e34Aae001815bf',
      dataFeed: '0xE3118A926cde694bFd8D2dCb894dcBEF443961EB',
      depositVault: '0x2c851A37eF2d607F198DDB259309Dcd2B398E8f9',
      redemptionVaultSwapper: '0x6D6e88B8514EA404d33f38D505d611B5EEe23AfD',
    },
    mMEV: {
      token: '0xeCacb5434F05A548FAf92a31874e0c014bEeee91',
      customFeed: '0xa28140D669Edf5c6529Ee50160F5B2702ecAA73b',
      dataFeed: '0x2da917Ab125B0e88dB1eb896ebdA93a31FA2b804',
      depositVault: '0xb285f7699206C88A0aEC8bb004e42793de8139e0',
      redemptionVaultSwapper: '0xe8a95184516C39469a68BA50D134C25fc5A6C9c8',
    },
    mRE7: {
      token: '0x27329B57666413b84dcb872fe611eDbFe9A1a9ad',
      customFeed: '0x028c6A15C60827ee60c1Dc6585E54055e462effc',
      dataFeed: '0xb7860740190BAf70eFd38B9c3db0CCeb88525315',
      depositVault: '0x9815FffE5600cF71342579f0f3E0Dd8ccBd496D8',
      redemptionVaultSwapper: '0x139EC173b9c355241dfA91A1DE3453Adae0A9083',
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
    mSL: {
      token: '0x34BDdA6beb128130158811E5b881Da67902325B2',
      customFeed: '0xc4Fb2B5Ddd40764914B1A3C38a01079259Ab31C5',
      dataFeed: '0xf4612868e55149e12F32DCd68Aefcc0F618381AE',
      depositVault: '0xFecc6FDFF76fB2A2De42B787dC3D02B634a8b6D9',
      redemptionVaultSwapper: '0x5CB155D19696ED296dc4942BEDB6EEc69367c332',
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
        token: '0xdddD73F5Df1F0DC31373357beAC77545dC5A6f3F',
        aggregator: '0x6022a020Ca5c611304B9E97F37AEE0C38455081A',
        dataFeed: '0xcbCf1e67F1988e2572a2A620321Aef2ff73369f0',
      },
    },
    mTBILL: {
      token: '0xE85f2B707Ec5Ae8e07238F99562264f304E30109',
      customFeed: '0xb701ABEA3E4b6EAdAc4F56696904c5F551d2617b',
      dataFeed: '0x73a64469E0974371005ca0f60Dfc10405613b411',
      depositVault: '0xb05F6aa8C2ea9aB8537cF09A9B765a21De249224',
      redemptionVault: '0x3aC6b2Bf09f470e5674C3DA60Be7D2DA2791F897',
    },
    mBASIS: {
      token: '0x0c78Ca789e826fE339dE61934896F5D170b66d78',
      customFeed: '0x01D169AAB1aB4239D5cE491860a65Ba832F72ef2',
      dataFeed: '0x7588139737f32A6da49b9BB03A0a91a45603b45F',
      depositVault: '0x8F38A24d064B41c990a3f47439a7a7EE713BF8Dc',
      redemptionVaultSwapper: '0x9B0d0bDAE237116F711E8C9d900B5dDCC8eF8B5D',
    },
    mEDGE: {
      token: '0x69020311836D29BA7d38C1D3578736fD3dED03ED',
      customFeed: '0x7D5622Aa8Cc259Ae39fBA51f3C1849797FB7e82D',
      dataFeed: '0xa30e78AF094EFC51434693803fEE1D77f568321E',
      depositVault: '0x23dE49C9ECb8bAaF4aBDeD123FaFbb7D5b7a0eE2',
      redemptionVaultSwapper: '0xC874394Cd67F7de462eb5c25889beC9744Bc0F80',
    },
    mMEV: {
      token: '0x7d611dC23267F508DE90724731Dc88CA28Ef7473',
      customFeed: '0x4e5B43C9c8B7299fd5C7410b18e3c0B718852061',
      dataFeed: '0x06fa9188680D8487e2b743b182CCc39654211C84',
      depositVault: '0xe6F0C60Fca2bd97d633a3D9D49DBEFDF19636D8c',
      redemptionVaultSwapper: '0x331Af8984d9f10C5173E69537F41313996e7C3Cc',
    },
    mSL: {
      token: '0x8899A7363EFA9091DA11A84064cd669685544C88',
      customFeed: '0x91a5FAEe94dfFF5D14fC526730bd62581e80B28f',
      dataFeed: '0xFDfDD9A7dEE634cA8B9d297C40461B14BA598fe8',
      depositVault: '0xc4E4aCA6A81794562c46DA86c20dc652bA2Af25E',
      redemptionVaultSwapper: '0xf22Ad227b3082557dBDA8AD99B694eb295c06092',
    },
    accessControl: '0xefED40D1eb1577d1073e9C4F277463486D39b084',
  },
  rootstock: {
    dataFeeds: {
      usdc: {
        aggregator: '0x83c6f7F61A55Fc7A1337AbD45733AD9c1c68076D',
        token: '0x74C9F2B00581F1b11Aa7Ff05aa9f608B7389de67',
        dataFeed: '0x6A3A467CCA184E395042fAb35d9fc7Eb789885De',
      },
      wrbtc: {
        aggregator: '0x032Ce76Fd927431Bdb532EcFAc5Db0D6B6Ea0De3',
        token: '0x542fda317318ebf1d3deaf76e0b632741a7e677d',
        dataFeed: '0x442e9888bdE0E7009A11638Bba94244A697050E6',
      },
    },
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    mTBILL: {
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      customFeed: '0x0Ca36aF4915a73DAF06912dd256B8a4737131AE7',
      dataFeed: '0x088A4bE7e9b164241cd4b9cAdeEa60999c2CE916',
      depositVault: '0xf454A52DA2157686Ef99702C0C19c0E8D66bC03c',
      redemptionVault: '0x99D22115Fd6706B78703fF015DE897d43667D12F',
    },
    mBTC: {
      token: '0xEF85254Aa4a8490bcC9C02Ae38513Cae8303FB53',
      customFeed: '0xa167BFbeEB48815EfB3E3393d91EC586c2421821',
      dataFeed: '0xa3A252Babc8A576660c6B8B9e3bD096D2f5017cE',
      depositVault: '0x79A15707E2766d486681569Bd1041821f5e32998',
      redemptionVault: '0xe7a1A676D0CCA2e20A69adD500985C7271a40205',
    },
  },
  hyperevm: {
    dataFeeds: {
      usdt: {
        token: 'TODO',
        aggregator: '0x5e21f6530f656A38caE4F55500944753F662D184',
        dataFeed: '0xCB01C192F223e3c55Ae1E1885A9464131aA985C2',
      },
    },
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    hbUSDT: {
      token: '0x5e105266db42f78FA814322Bce7f388B4C2e61eb',
      customFeed: '0xAc3d811f5ff30Aa3ab4b26760d0560faf379536A',
      dataFeed: '0x2812076947e07FF85734afEa2c438BA6dcEb2083',
      depositVault: '0xbE8A4f1a312b94A712F8E5367B02ae6E378E6F19',
      redemptionVaultSwapper: '0xC898a5cbDb81F260bd5306D9F9B9A893D0FdF042',
    },
  },
  etherlink: {
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    dataFeeds: {
      usdc: {
        token: '0x796Ea11Fa2dD751eD01b53C372fFDB4AAa8f00F9',
        aggregator: '0x4F9A119FbE04F89A0491F7c983B9363ED42b187b',
        dataFeed: '0x57F06e32d99227D65eb6BD87EDeA3a18fe4D79dE',
      },
    },
    mTBILL: {
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      customFeed: '0x80dA45b66c4CBaB140aE53c9accB01BE4F41B7Dd',
      dataFeed: '0x2bDC9c452a4F52DfFD92B0cad371aCbCaeabf918',
      depositVault: '0xd65BFeB71271A4408ff335E59eCf6c5b21A33a70',
      redemptionVault: '0x7f938d26b6179A96870afaECfB0578110E53A3b2',
    },
    mBASIS: {
      token: '0x2247B5A46BB79421a314aB0f0b67fFd11dd37Ee4',
      customFeed: '0x31D211312D9cF5A67436517C324504ebd5BD50a0',
      dataFeed: '0xF6Ca9280cAF31Ce24b7d9f6A96E331b3830797fb',
      depositVault: '0x75C32818ce59D913f9E2aeDEcd5697566Ff9aE4A',
      redemptionVaultSwapper: '0x02e58De067a0c63B3656D7e1DF9ECBCbc9E5ffC6',
    },
    mMEV: {
      token: '0x5542F82389b76C23f5848268893234d8A63fd5c8',
      customFeed: '0x077670B2138Cc23f9a9d0c735c3ae1D4747Bb516',
      dataFeed: '0xB26f6F2821F85112aD0f452d18265Ce9BdC73aCE',
      depositVault: '0x577617613C4FaC5A7561F8f3F2Cb128A560774Bc',
      redemptionVaultSwapper: '0x403a92A980903707FD8A3A1101f48Eb3ebd58166',
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
    mSL: {
      token: '0x19569a89fEf7276a7f5967b6F6910c0573616f07',
      customFeed: '0xb64C014307622eB15046C66fF71D04258F5963DC',
      dataFeed: '0xffd462e0602Dd9FF3F038fd4e77a533f8c474b65',
      depositVault: '0x56814399caaEDCEE4F58D2e55DA058A81DDE744f',
      redemptionVaultSwapper: '0xFeB770Ae942ef5ed377c6D4BbC50f9d3b25Cf69b',
    },
    eUSD: {
      token: '0xDd5a54bA2aB379A5e642c58F98aD793A183960E2',
      depositVault: '0x056339C044055819E8Db84E71f5f2E1F536b2E5b',
      redemptionVault: '0xE4f2AE539442e1D3Fb40F03ceEbF4A372a390d24',
    },
    hbUSDT: {
      token: '0x43881B05C3BE68B2d33eb70aDdF9F666C5005f68',
      customFeed: '0x92004DCC5359eD67f287F32d12715A37916deCdE',
      dataFeed: '0xbA9FD2850965053Ffab368Df8AA7eD2486f11024',
      depositVault: '0x6Be2f55816efd0d91f52720f096006d63c366e98',
      redemptionVaultSwapper: '0x9aEBf5d6F9411BAc355021ddFbe9B2c756BDD358',
    },
    accessControl: '0xbf25b58cB8DfaD688F7BcB2b87D71C23A6600AaC',
  },
  tacTestnet: {
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    dataFeeds: {
      usdt: {
        token: '0x35e1BAF9Edb192536E68d0B5c1214a7DA21e0F32',
        aggregator: '0x8A880Cd417E6782B2d764e54D2e929dbD6f92373',
        dataFeed: '0x7C32e4AfB7a86AE4D14Ab44D3a3E52EfDD562a23',
      },
    },
    mMEV: {
      token: '0xC0e42a27A53AF273a3AA1D87A10C4d547a5822cb',
      customFeed: '0x56687fC05451028fe4747804C9507aBE655F1DF6',
      dataFeed: '0x94A186a032D9e43C7488D046C8465cfEBD7f830d',
      depositVault: '0xCFd53AABD43AD31a229194b60b90eF26dfEB5FCB',
      redemptionVault: '0x06A317991F2F479a6213278b32D17a126FcaB501',
    },
  },
  hardhat: undefined,
  localhost: undefined,
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (midasAddressesPerNetwork as any)[hre.network.name] as
    | MidasAddresses
    | undefined;
};
