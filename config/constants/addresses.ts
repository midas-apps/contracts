import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../networks';
import { ConfigPerNetwork, MTokenName, PaymentTokenName } from '../types';

export type RedemptionVaultType =
  | 'redemptionVault'
  | 'redemptionVaultBuidl'
  | 'redemptionVaultSwapper'
  | 'redemptionVaultUstb';

export type DepositVaultType = 'depositVault' | 'depositVaultUstb';

export type TokenAddresses = {
  customFeed?: string;
  dataFeed?: string;
  token?: string;
  depositVault?: string;
  depositVaultUstb?: string;
} & Partial<Record<RedemptionVaultType, string>>;

export type VaultType = RedemptionVaultType | DepositVaultType;

export type DataFeedAddressesRegular = {
  token?: string;
  dataFeed?: string;
  aggregator?: string;
};

export type DataFeedAddressesComposite = {
  token?: string;
  numerator?: {
    dataFeed?: string;
    aggregator?: string;
  };
  denominator?: {
    dataFeed?: string;
    aggregator?: string;
  };
  dataFeed?: string;
};

export type DataFeedAddresses =
  | DataFeedAddressesRegular
  | DataFeedAddressesComposite;

export type MidasAddresses = Partial<Record<MTokenName, TokenAddresses>> & {
  accessControl?: string;
  timelock?: string;
  paymentTokens?: Partial<Record<PaymentTokenName, DataFeedAddresses>>;
};

export const midasAddressesPerNetwork: ConfigPerNetwork<
  MidasAddresses | undefined
> = {
  main: {
    paymentTokens: {
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
      usds: {
        aggregator: '0xfF30586cD0F29eD462364C7e81375FC0C71219b1',
        token: '0xdc035d45d973e3ec169d2276ddab16f1e407384f',
        dataFeed: '0x62c81E9A3BC0032CB504A850b1B7172604F15e5e',
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
      stone: {
        aggregator: '0x057f30e63A69175C69A4Af5656b8C9EE647De3D0',
        token: '0x7122985656e38bdc0302db86685bb972b145bd3c',
        dataFeed: '0x7188756da3D736C3b2acBd1935a1AdB64E5D5B56',
      },
      weth: {
        token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        aggregator: '0xfE052C2447753f448d656450e675Df59b251b1e1',
        dataFeed: '0x4CFd862d774356AB825B503b4AA2e6F95bC76Fd3',
      },
      cmeth: {
        token: '0xe6829d9a7ee3040e1276fa75293bde931859e8fa',
        aggregator: '0xa59729aa4680019aD173e182D85B76c0D7dBAE9b',
        dataFeed: '0x2A2bDBc40672684e3913b7C20950a9029aB75fB7',
      },
      weeth: {
        token: '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee',
        aggregator: '0x6E3B7fb913991eD1fFbb26b314132Dae0AAE8522',
        dataFeed: '0x2AeE3eaFf5e323948De261cDABE49024e3Dbb7dc',
      },
      susde: {
        token: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
        aggregator: '0xcE2326260C168525A3E905391E8bFEE00EBd0CEa',
        dataFeed: '0x6D233Cd3912FAFa6aDB872775Bf00C0D54cfF437',
      },
      usde: {
        token: '0x4c9edd5852cd905f086c759e8383e09bff1e68b3',
        aggregator: '0xa569d910839Ae8865Da8F8e70FfFb0cBA869F961',
        dataFeed: '0xe7eCe9331f9B03638D17791bC46b8386960ad2D6',
      },
      rseth: {
        token: '0xa1290d69c65a6fe4df752f95823fae25cb99e5a7',
        aggregator: '0xD52ba087E30928886BAbA15b1584d4ac9ABaAB2a',
        dataFeed: '0xfCC991035F74FC2bC203c816237eb7132a00aD56',
      },
      rsweth: {
        token: '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0',
        aggregator: '0x0C3f5fafB87318C0dEaEBfF096aBA019501fCb69',
        dataFeed: '0x24aea62B7F250aB579B62817C46Ed356b2473e10',
      },
      sweth: {
        token: '0xf951E335afb289353dc249e82926178EaC7DEd78',
        aggregator: '0xB79301126F9641B20771e3276b9011A481534BcC',
        dataFeed: '0x1498dDc5387Bc9f6dc8cDa60f420A4fCE056BAF7',
      },
      wsteth: {
        token: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        aggregator: '0xA74F994672f232a30067DA820f0E54881EdBB9D7',
        dataFeed: '0x452A721F7536dE765DE4dfEB7b0dC9984448F9d2',
      },
      lbtc: {
        token: '0x8236a87084f8b84306f72007f36f2618a5634494',
        aggregator: '0x9e6050589879b2e95dd829Cfe02E88DE82F4279C',
        dataFeed: '0xA37cfCd0bB43214Ac9ED7249983F29A2Ef324C1b',
      },
      solvbtc: {
        token: '0x7a56e1c57c7475ccf742a1832b028f0456652f97',
        aggregator: '0xfcf0Fd056f999115ED29f203897C6bf7109602e7',
        dataFeed: '0x24722255b156F7F666543b99C01a85284bcB1A69',
      },
      cbbtc: {
        token: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        aggregator: '0xFa4f57E80AC77A2679e1ADFD9906977769457718',
        dataFeed: '0x6545603e5C6B7f59085c230B2C0Bf2658b83aAc3',
      },
      sbtc: {
        token: '0x094c0e36210634c3CfA25DC11B96b562E0b07624',
        aggregator: '0x90cd346249AE3be7898ADF54F87585B7415b8508',
        dataFeed: '0x53a709f891c6E88148E0d2C4570523be1dEAf113',
      },
      enzobtc: {
        token: '0x6A9A65B84843F5fD4aC9a0471C4fc11AFfFBce4a',
        aggregator: '0x2C2d0C67d1486b7D45cbC0AD06CaE35C6c721499',
        dataFeed: '0x6e043378aba34B0e61eB0889462835CbD50D30dF',
      },
      ebtc: {
        token: '0x657e8C867D8B37dCC18fA4Caead9C45EB088C642',
        aggregator: '0x7DAEe1240a0D21f5C800A328712787211bf837Cd',
        dataFeed: '0x63F4fE61C6D9eaDE190fccA5A5432660eA5BF8B3',
      },
      swbtc: {
        token: '0x8db2350d78abc13f5673a411d4700bcf87864dde',
        aggregator: '0x3E45D8Cf3c9119af1483b7F6B79483aFcD4Dd14C',
        dataFeed: '0x4323c738548A0C3Cdde9F4B150ad4dcef8116aA1',
      },
      pumpbtc: {
        token: '0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e',
        aggregator: '0x95A17B75ab2A83a5ffE2F21F17cEe52eBBD5b87d',
        dataFeed: '0x3c24Ec0dd9d33a0ad0d331D008D32268Ee441AE9',
      },
      usr: {
        token: '0x66a1E37c9b0eAddca17d3662D6c05F4DECf3e110',
        dataFeed: '0x3aAc6fd73fA4e16Ec683BD4aaF5Ec89bb2C0EdC2',
        aggregator: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
      },
      tbtc: {
        token: '0x18084fba666a33d37592fa2633fd49a74dd93a88',
        aggregator: '0x504C048C36ff22b90D82Fb70fef99b321411Fb5d',
        dataFeed: '0x19569a89fEf7276a7f5967b6F6910c0573616f07',
      },
      syrupusdc: {
        token: '0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b',
        aggregator: '0xB1e60a45dE12adB09D67bC361ed7A79FfD237850',
        dataFeed: '0x449f44f9B5e924E27ba9bC4E49AcD8BC1012287c',
      },
      syrupusdt: {
        token: '0x356B8d89c1e1239Cbbb9dE4815c39A1474d5BA7D',
        aggregator: '0xAd298d3eC4Af69Af52701A539d3bD14873Ac8493',
        dataFeed: '0x1bB6DDf0886c04e23978b755C0574BA92f32F0fA',
      },
    },
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    mTBILL: {
      dataFeed: '0xfCEE9754E8C375e145303b7cE7BEca3201734A2B',
      customFeed: '0x056339C044055819E8Db84E71f5f2E1F536b2E5b',
      token: '0xDD629E5241CbC5919847783e6C96B2De4754e438',
      depositVault: '0x99361435420711723aF805F08187c9E6bF796683',
      redemptionVault: '0xF6e51d24F4793Ac5e71e0502213a9BBE3A6d4517',
      redemptionVaultUstb: '0x569D7dccBF6923350521ecBC28A555A500c4f0Ec',
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
    mFONE: {
      token: '0x238a700eD6165261Cf8b2e544ba797BC11e466Ba',
      customFeed: '0x8D51DBC85cEef637c97D02bdaAbb5E274850e68C',
      dataFeed: '0xCF4e49f5e750Af8F2f9Aa1642B68E5839D9c1C00',
      depositVault: '0x41438435c20B1C2f1fcA702d387889F346A0C3DE',
      redemptionVaultSwapper: '0x44b0440e35c596e858cEA433D0d82F5a985fD19C',
    },
    mHYPER: {
      token: '0x9b5528528656DBC094765E2abB79F293c21191B9',
      customFeed: '0x43881B05C3BE68B2d33eb70aDdF9F666C5005f68',
      dataFeed: '0x92004DCC5359eD67f287F32d12715A37916deCdE',
      depositVault: '0xbA9FD2850965053Ffab368Df8AA7eD2486f11024',
      redemptionVaultSwapper: '0x6Be2f55816efd0d91f52720f096006d63c366e98',
    },
    mAPOLLO: {
      token: '0x7CF9DEC92ca9FD46f8d86e7798B72624Bc116C05',
      customFeed: '0x84303e5568C7B167fa4fEBc6253CDdfe12b7Ee4B',
      dataFeed: '0x9aEBf5d6F9411BAc355021ddFbe9B2c756BDD358',
      depositVault: '0xc21511EDd1E6eCdc36e8aD4c82117033e50D5921',
      redemptionVaultSwapper: '0x5aeA6D35ED7B3B7aE78694B7da2Ee880756Af5C0',
    },
    mLIQUIDITY: {
      token: '0x841EEb3e2489B2282b0E14202Dc8Bd8F7624e29A',
      customFeed: '0x74508886cDFEF22FddEDcA0d9Caf9E00E876C5aF',
      dataFeed: '0xBF2a93B420225558a76FC9888C687c14977E6E7C',
      depositVault: '0xf89fEbef93c54618C4420Ee4173e69Cd21B27e3a',
      redemptionVault: '0x97acdfb3956403c4c6bbe837dc611e3a6ba1b3a7',
    },
    hypeETH: {
      token: '0x8E2C2C9dEF45efB9Bd3C448945830Ddb254154BE',
      customFeed: '0x1ce3E159F37c36fD1FF9C3b5Af8725EF890955DD',
      dataFeed: '0xE451b79DfC4A808537A3521A7A5717f4e04ebf5d',
      depositVault: '0x416ec6E04c009F9Bae99a47ef836BF2cc64Ec93c',
      redemptionVaultSwapper: '0x1FE17936c1CdC73c857263997716e3A60B9291C7',
    },
    hypeBTC: {
      token: '0xFFa36b4b011d87D89Fef3098aB30fEf7bcC3571e',
      customFeed: '0xF89D50aff35f9e57125B7eDfE6394e943Ed2b3C7',
      dataFeed: '0x57DA0556F85Aa7e59B8053A2929B759236dfE27E',
      depositVault: '0x164645fbC7220a3b4f8f5C6B473bCf1b6db146DD',
      redemptionVaultSwapper: '0x4BCfDA0A844B49dA8Bb19562EE52Cc385395001A',
    },
    hypeUSD: {
      token: '0xA48CfD53263ADe6abDb0ac75287Cc0d5A2EEE17F',
      customFeed: '0x0f50b401509798F1919a4e8D38192F78734e49C0',
      dataFeed: '0x3DE2e700d220928fF5180691004824d8Ad42F5d4',
      depositVault: '0xd6FD5D4Fa64Fc7131e0ec3A4A53dC620A0FFc1Bc',
      redemptionVaultSwapper: '0x7b83aA7b4CE8C7a021Cafc862a030129cEbf799d',
    },
    tUSDe: {
      token: '0xA01227A26A7710bc75071286539E47AdB6DEa417',
      customFeed: '0xa384E76d44bF8ac899B489354fB1A5aAB53893DB',
      dataFeed: '0x8335d94170C4275EbeE7c0Ff8AD3F4C0752eCe2d',
      depositVault: '0x5AD2e3d65f8eCDc36eeba38BAE3Cc6Ff258D2dfa',
      redemptionVaultSwapper: '0xFaAE52c6A6d477f859a740a76B29c33559ace18c',
    },
    tETH: {
      token: '0xa1150cd4A014e06F5E0A6ec9453fE0208dA5adAb',
      customFeed: '0xEA6a495bA398FAE5f9780335FE27f33E6cCC995E',
      dataFeed: '0x5696B69Be96e936e8E489070Eb3d4F0e1fE966af',
      depositVault: '0xC93bb8D5581D74272F0E304593af9Ab4E3A0181b',
      redemptionVaultSwapper: '0xE042678e6c6871Fa279e037C11e390f31334ba0B',
    },
    tBTC: {
      token: '0x6b6b870C7f449266a9F40F94eCa5A6fF9b0857E4',
      customFeed: '0x65C4e04Cc26aAdd1eC95C54Cd6dBa61a270F15ca',
      dataFeed: '0x5A096AC89eaEF68930352a15Da49e4eB8590Bf1d',
      depositVault: '0xAFCC1C556EE0436c10A3054B3d615ABB93A352B5',
      redemptionVaultSwapper: '0x2db1eC186acDeaf7d0fc78bFfE335560b0fE0085',
    },
    mevBTC: {
      token: '0xb64C014307622eB15046C66fF71D04258F5963DC',
      customFeed: '0xffd462e0602Dd9FF3F038fd4e77a533f8c474b65',
      dataFeed: '0x56814399caaEDCEE4F58D2e55DA058A81DDE744f',
      depositVault: '0xA6d60A71844bc134f4303F5E40169D817b491E37',
      redemptionVaultSwapper: '0x2d7d5b1706653796602617350571B3F8999B950c',
    },
    mFARM: {
      token: '0xA19f6e0dF08a7917F2F8A33Db66D0AF31fF5ECA6',
      customFeed: '0x65df7299A9010E399A38d6B7159d25239cDF039b',
      dataFeed: '0x9f49B0980B141b539e2A94Ec0864Faf699fF9524',
      depositVault: '0x695fb34B07a8cEc2411B1bb519fD8F1731850c81',
      redemptionVaultSwapper: '0xf4F042D90f0C0d3ABA4A30Caa6Ac124B14A7e600',
    },
    msyrupUSD: {
      token: '0x20226607b4fa64228ABf3072Ce561d6257683464',
      customFeed: '0x41c60765fA36109b19B21719F4593F19dDeFa663',
      dataFeed: '0x81c097e86842051B1ED4299a9E4d213Cb07f6f42',
      depositVault: '0x5AE23D23B7986a708CBA9bF808aD9A43BF77d1b7',
      redemptionVaultSwapper: '0x9f7dd5462C183B6577858e16a13A4d864CE2f972',
    },
    msyrupUSDp: {
      token: '0x2fE058CcF29f123f9dd2aEC0418AA66a877d8E50',
      customFeed: '0x337d914ff6622510FC2C63ac59c1D07983895241',
      dataFeed: '0x7833397dA276d6B588e76466C14c82b2d733Cfb6',
      depositVault: '0x8493f1f2B834c2837C87075b0EdAc17f5273789a',
      redemptionVaultSwapper: '0x71EFa7AF1686C5c04AA34a120a91cb4262679C44',
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
    zeroGUSDV: {
      token: '0x766255b53ae70fa39A18aa296f41fAb17db6a810',
      customFeed: '0xB5721B11883aEc70696A1082051d36c79cA9B10c',
      dataFeed: '0x9f819f7741e52C13Bc5207e78B6E3FeC1BdF3990',
      depositVault: '0x34031E751DA2Ab19009D8f7eb268Face2BdFD0dd',
      redemptionVaultSwapper: '0x37769aF173Ea65dfc2880179940d5566817aF6AE',
    },
    zeroGETHV: {
      token: '0x513bD45bE7643fE6c30c41Cd4b327E8E341AAF9a',
      customFeed: '0x03fDA274c303b128EBA9E00Bf555A3f4f4f26ec3',
      dataFeed: '0xc18091A0E2970945646d28Fad3A0ded684b8947b',
      depositVault: '0xaA192F810106B6161cbe5FE531289C0e3B196DEB',
      redemptionVaultSwapper: '0xF0C91Bbae7f67c4e595d723ef5FB38B59F2008cf',
    },
    zeroGBTCV: {
      token: '0x48E284D0729EB1925066307072758d95dbBb49C4',
      customFeed: '0x8c7400777bD4B05864f21c446f6a3e996BC047d2',
      dataFeed: '0x39F0507060c12bB88cb68a496544011D2f341455',
      depositVault: '0x2ddC913e4C7674A7E42c55db48a92c47158E91C6',
      redemptionVaultSwapper: '0x649f8698068ad143A7e18Ba9cb0Be112D5986AEb',
    },
    JIV: {
      token: '0xc470e9fC12A60F72C543516dC23de1F55C29E3D5',
      customFeed: '0xc4fB4B8641ac466758Dc05276c00EB570F587ED1',
      dataFeed: '0x15A4c3E5a3e955A81A570e617D83680f57EE3862',
      depositVault: '0x30aCCEeDFf97A3fe11aB52EE7425Af4589338C06',
      redemptionVaultSwapper: '0x5572Eb7f4fB679Ff6A99203f12B0484dC1062d78',
    },
    mRE7BTC: {
      token: '0x9FB442d6B612a6dcD2acC67bb53771eF1D9F661A',
      customFeed: '0x9de073685AEb382B7c6Dd0FB93fa0AEF80eB8967',
      dataFeed: '0xB5D6483c556Bc6810b55B983315016Fcb374186D',
      depositVault: '0x5E154946561AEA4E750AAc6DeaD23D37e00E47f6',
      redemptionVaultSwapper: '0x4Fd4DD7171D14e5bD93025ec35374d2b9b4321b0',
    },
    acreBTC: {
      token: '0xC344Db27Feba7F0a881A50f0f702a525a44f2368',
      customFeed: '0xD0eEd92DB46B099f8DEA366a7198b5Dd249Af61F',
      dataFeed: '0x7d5B8ab9C948fb11433e0eDdADD718dc5Cb040bb',
      depositVault: '0x52e808bD3496c69c705028a258aEe0a6E1a5b35D',
      redemptionVaultSwapper: '0x319a05E260acC2490768A726Ccfd341D4b3D5106',
    },
    mWildUSD: {
      token: '0x605A84861EE603e385b01B9048BEa6A86118DB0a',
      customFeed: '0xb70eCe4F1a87c419E1082691Bb9a49eb7CaAe6a6',
      dataFeed: '0xe604a420388Fbf2693F2250db0DC84488EE99aA1',
      depositVault: '0xd252EB9d448dB3A46d9c1476A7eb45E5c0CED7C2',
      redemptionVaultSwapper: '0x2f98A13635F6CEc0cc45bC1e43969C71d68091d6',
    },
  },
  arbitrum: {
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    paymentTokens: {
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
    paymentTokens: {
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
    mLIQUIDITY: {
      token: '0x6B35F2E4C9D4c1da0eDaf7fd7Dc90D9bCa4b0873',
      customFeed: '0x1c56b73e0f22055dA155D7a73731AE62906302eD',
      dataFeed: '0x544af5fd877974F99623cC56A8d98f983072a0E3',
      depositVault: '0xEa22F8C1624c17C1B58727235292684831A08d56',
      redemptionVault: '0x86811aD3430DbA37e1641538729bF346c20A5412',
    },
  },
  oasis: {
    paymentTokens: {
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
    paymentTokens: {
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
    mLIQUIDITY: {
      token: '0xCB8A625dE78e029D17377478fF3cDa8aD9Ff7661',
      customFeed: '0x731873cB1a1e63A72Afbd4923Fe15210BbC048ba',
      dataFeed: '0xbD29e7882b5709bB375A079AE7b886e270A91A7e',
      depositVault: '0x71DD2570a843B0D1c74FFAb23F348193F19F18B1',
      redemptionVault: '0x3Cd58EFe911B1e936c014695CCfaB8c8825E3a63',
    },
    accessControl: '0xefED40D1eb1577d1073e9C4F277463486D39b084',
  },
  rootstock: {
    paymentTokens: {
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
    paymentTokens: {
      usdt: {
        token: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb',
        aggregator: '0x5e21f6530f656A38caE4F55500944753F662D184',
        dataFeed: '0xCB01C192F223e3c55Ae1E1885A9464131aA985C2',
      },
      usde: {
        token: '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34',
        aggregator: '0xcA727511c9d542AAb9eF406d24E5bbbE4567c22d',
        dataFeed: '0x1CC42c97E7c598A1d1b2E71C84A9C0AD9b3D42E7',
      },
      usr: {
        token: '0x0aD339d66BF4AeD5ce31c64Bc37B3244b6394A77',
        aggregator: '0x29d2fEC890B037B2d34f061F9a50f76F85ddBcAE',
        dataFeed: '0x47FddEC235Aa35625Fd2bAd34FB373b3A4B6Dd74',
      },
      xaut0: {
        token: '0xf4D9235269a96aaDaFc9aDAe454a0618eBE37949',
        aggregator: '0xE90348C06e1adeEC6AB04eF899dC579597c62637',
        dataFeed: '0xcC10c5689ADC11bEf3Ea9e11Da0BD9268a4a3Fa7',
      },
      usdhl: {
        token: '0xb50A96253aBDF803D85efcDce07Ad8becBc52BD5',
        aggregator: '0x215ADBE371A3664640c67d754466CCeE102e9349',
        dataFeed: '0x289584e63A61C69EEE170cD553cff8B3FFD56EA7',
      },
      wsthype: {
        token: '0x94e8396e0869c9F2200760aF0621aFd240E1CF38',
        aggregator: '0xe6E8baDBB469d16e2060e1Ebeb60F92B2a1250A9',
        dataFeed: '0xD28b1AB7098E7434a7b4eFdC99c35fb85CfD92C1',
      },
      khype: {
        token: '0xfD739d4e423301CE9385c1fb8850539D657C296D',
        aggregator: '0xFfe5F5e9e18b88FBdD7e28d4A583a111C874fB47',
        dataFeed: '0x5A55899f324bF45DD2dA0b97E145774a4668A9E4',
      },
      whype: {
        token: '0x5555555555555555555555555555555555555555',
        aggregator: '0x7F1f3E3D57E5549828909AE3381C7bFF05A4fE09',
        dataFeed: '0xE1C769D56Cb6448813732F7736041425AA0A4A75',
      },
      usdc: {
        aggregator: '0x4C89968338b75551243C99B452c84a01888282fD',
        dataFeed: '0x0C59a087922f21eb49FFa0fe33E0D17B62Ff4C70',
        token: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
      },
      behype: {
        token: '0xd8FC8F0b03eBA61F64D08B0bef69d80916E5DdA9',
        aggregator: '0x8C4Bf0020E9EbBb9ed7C4A2726F2824D29542c01',
        dataFeed: '0xE66f2727e99c5067463dB46E7e6595A1af1b55f0',
      },
      ubtc: {
        token: '0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463',
        numerator: {
          aggregator: '0x7d05cd5159F38694A7D4dBf58957146a63c8Ad5A',
          dataFeed: '0xE3c79bFA56Ed7ACb89028de4345371Ea93fB3434',
        },
        denominator: {
          aggregator: '0x3587a73AA02519335A8a6053a97657BECe0bC2Cc',
          dataFeed: '0xd81448A57E88fb704Af0DC43eA2586BC4EF996ef',
        },
        dataFeed: '0x610CB88e101d9E7e8163ae7788B873d272499df3',
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
    hbXAUt: {
      token: '0x6EB6724D8D3D4FF9E24d872E8c38403169dC05f8',
      customFeed: '0xf3dB9f59f9C90495D1c9556fC5737A679720921d',
      dataFeed: '0xdb981793d483B612AF23e29F0282aD23Fe6C3845',
      depositVault: '0x48fb106Ef0c0C1a19EdDC9C5d27A945E66DA1C4E',
      redemptionVaultSwapper: '0xD26bB9B45140D17eF14FbD4fCa8Cf0d610ac50E7',
    },
    lstHYPE: {
      token: '0x81e064d0eB539de7c3170EDF38C1A42CBd752A76',
      customFeed: '0x2b959a9Deb8e62FaaEA1b226F3bbcbcC0Af31560',
      dataFeed: '0x7d876E544F12bD3347B9e904F0fb2d83bEd59a27',
      depositVault: '0x2b158D44eEbb03a025F75B79F1d8B3004Ac97737',
      redemptionVaultSwapper: '0x1eff01e0784ae8d06a17AF29A2300D2A9cdA5440',
    },
    liquidHYPE: {
      token: '0x441794D6a8F9A3739F5D4E98a728937b33489D29',
      customFeed: '0x1CeaB703956e24b18a0AF6b272E0bF3F499aCa0F',
      dataFeed: '0x70519793f50c95f435972637E1190f41cfc907Bd',
      depositVault: '0xF538675D292d8b372712f44eaf306Cc66cF6d8DC',
      redemptionVaultSwapper: '0x558806a80b42cAB4ED75c74bfB178EDc9087AA32',
    },
    hbUSDC: {
      token: '0x057ced81348D57Aad579A672d521d7b4396E8a61',
      customFeed: '0xc82CAd78983436BddfcAf0F21316207D87b87462',
      dataFeed: '0xb013A5956f8b838B7E668DFbdf1efA978Ccc7a23',
      depositVault: '0xd202CF41a607627cd1A31f650D13599b588eBd1c',
      redemptionVaultSwapper: '0xBb820D0c85C0B5D1B0dC8C6D3541fbb1AB4C7a60',
    },
    wVLP: {
      token: '0xD66d69c288d9a6FD735d7bE8b2e389970fC4fD42',
      customFeed: '0xA9fFe62E785324cb39cB5E2B3Ef713674391d31F',
      dataFeed: '0x765FA39C3759408C383C18bb50F70efDcedB26A6',
      depositVault: '0xc800f672EE8693BC0138E513038C84fe2D1B8a78',
      redemptionVaultSwapper: '0x462B95575cb2D56de9d1aAaAAb452279B058Aa06',
    },
    dnHYPE: {
      token: '0x949a7250Bb55Eb79BC6bCC97fCd1C473DB3e6F29',
      customFeed: '0xEB3459316211aB3e2bfee836B989f50fe08AA469',
      dataFeed: '0x4e250D83C4D5A3C5e78875AE0c2876E2563A11A5',
      depositVault: '0xa4a6b89354E278666fb908CcdB16276AE151ff00',
      redemptionVaultSwapper: '0xBe61c1A27689c11b63378e84C9bB70A2cd616Fff',
    },
    dnPUMP: {
      token: '0x8858A307a85982c2B3CB2AcE1720237f2f09c39B',
      customFeed: '0x707e99655f24747cECEB298B3AAF7FA721EC77fC',
      dataFeed: '0xA7f4553adDce698cB3430A935404c42020caFb02',
      depositVault: '0xaF8FfEDF0e57eE9f6518340b9eb913fFa7dBc66b',
      redemptionVaultSwapper: '0x9c915C94066fF921264071aCB7D59DB6e0cBf0D7',
    },
    dnFART: {
      token: '0xb39C200d3094C05E048A8F13B69A221DB56D012a',
      customFeed: '0x62e14d2beD7467eDE5cbBeb150288453f51358c5',
      dataFeed: '0xf60C25E470c20B6410F2ba366c5Ac9f844923dc6',
      depositVault: '0x979a534e482Ec6578BEf7a05df3B3B25F11F956d',
      redemptionVaultSwapper: '0x448E290f8090Fe6Bed36Cb07340d43440Ec6ebd3',
    },
    kitUSD: {
      token: '0xd385BA55A22aC732cF435c5b5c3A1dfe5939bA4d',
      customFeed: '0xeBfc1F9B19E2a188Ae0FcFA4b08fC6Cd71b680FF',
      dataFeed: '0x2dA71aE5f0DD37EC57027DE94c87065c87Aeb7e2',
      depositVault: '0xfAa6625Afd58f69e09EEdd23Ec192Cd98C82C20E',
      redemptionVaultSwapper: '0xD197A60de47b3D0187D48DDd1653A009d5e4E5f8',
    },
    kitHYPE: {
      token: '0xaF801B65239B4De90F73e26f9Bd1260943A5E248',
      customFeed: '0x43E27934819eb31D726d8A5c92c535E13239C6A8',
      dataFeed: '0xB64eB43808De5CCaABF254356F9079C38B802448',
      depositVault: '0x89AB3b922e9aec6ae5D2220deBf343d137a098A0',
      redemptionVaultSwapper: '0x1cDd9b3163c7549a89F436d1Eb5C3476238f271e',
    },
    kitBTC: {
      token: '0x61896940f60A536f1d3Dae9580524542D58d3683',
      customFeed: '0xd2f570cb45E99F4d2279D05D15D24025d18F76C7',
      dataFeed: '0xc4AEc7D3D0894b0A693A1F3601cc96bF4765C432',
      depositVault: '0x210376434c1591f05399e3F1EF3f98C6e63d370E',
      redemptionVaultSwapper: '0x1605F7C0FF432Ea4cF2b36a2E35076187A1803b0',
    },
  },
  katana: {
    accessControl: '0x980f57b62060824799F23f87d6FA321653b6f069',
    timelock: '0x8d0074e92A97b2645F94E4711b08275c15998186',
    paymentTokens: {
      usol: {
        token: '0x9B8Df6E244526ab5F6e6400d331DB28C8fdDdb55',
        aggregator: '0xA9cBAa1ae3525d1F4164780903A7c771B13468ee',
        dataFeed: '0x5E40aB9A3128E603Bf368e5F62767ae8A744aFA9',
      },
      jitosol: {
        token: '0x6C16E26013f2431e8B2e1Ba7067ECCcad0Db6C52',
        aggregator: '0x1C0a310cf42F357087Be122e69ee402D19A265dC',
        dataFeed: '0x2e1Ed451e2d5C0f9EcD095497b59ecA4284559c0',
      },
      miusd: {
        token: '0xC31F7450BE8B7C61f93BeE3108116b0a6f0f0354',
        aggregator: '0x9Fe23AB494472f18A25f4b731704018bB90e1918',
        dataFeed: '0x45b826605EAF8A2501Bcf54572c58f82DB7A349f',
      },
      vbusdc: {
        token: '0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36',
        numerator: {
          aggregator: '0xe93083e814E1aC642F9191a0F3eCd6295F861064',
          dataFeed: '0xB06A034DB4305eC3Ce3553d84E28a670E90222c8',
        },
        denominator: {
          aggregator: '0xC1c112D0AEC13a5A7D1D2FE7caE842c498F9Bff9',
          dataFeed: '0x3DA895C21b10AbEc2A7Df828E0dFc64c046d887c',
        },
        dataFeed: '0x8e73B6994cC079e37A4d90a7B585d53Df334D40B',
      },
      vbusdt: {
        token: '0x2DCa96907fde857dd3D816880A0df407eeB2D2F2',
        numerator: {
          aggregator: '0xe93083e814E1aC642F9191a0F3eCd6295F861064',
          dataFeed: '0xB06A034DB4305eC3Ce3553d84E28a670E90222c8',
        },
        denominator: {
          aggregator: '0xC1c112D0AEC13a5A7D1D2FE7caE842c498F9Bff9',
          dataFeed: '0x3DA895C21b10AbEc2A7Df828E0dFc64c046d887c',
        },
        dataFeed: '0x8e73B6994cC079e37A4d90a7B585d53Df334D40B',
      },
    },
    mRE7SOL: {
      token: '0xC6135d59F8D10c9C035963ce9037B3635170D716',
      customFeed: '0x3E4b4b3Aed4c51a6652cdB96732AC98c37b9837B',
      dataFeed: '0x001b3731c706fEd93BDA240A5BF848C28ae1cC12',
      depositVault: '0x175A9b122bf22ac2b193a0A775D7370D5A75268E',
      redemptionVault: '0xE93E6Cf151588d63bB669138277D20f28C2E7cdA',
    },
    kmiUSD: {
      token: '0x184cFdA782CE61366010CAB23294fb22fa6189F5',
      customFeed: '0xD5ee1106e9bebd3D50A52D9B31Aa24B35B5bDaB4',
      dataFeed: '0xc19b5893Ab2aFc69092c6Dc2b01262f104c816C0',
      depositVault: '0xcb7d9A25F7b9bdd0Eee77B1cEb2894D39deBca1C',
      redemptionVaultSwapper: '0x8E3865B9d2d8e562d8bb3b15D9B4941AeE6f67f1',
    },
  },
  xrplevm: {
    accessControl: '0x831150f2A1283880C3B271f1fBaBFa6aBf3F4cAE',
    timelock: '0x737FD344751590aD7fC89B75b4144AFFb1D46DB0',
    paymentTokens: {
      xrp: {
        token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        aggregator: '0xd2BD1Ee9535396e010007c1e61c918a11cD74D62',
        dataFeed: '0x16A05aE0cC2F0329Ad96445D670D4225FE41FFd5',
      },
    },
    mXRP: {
      token: '0x06e0B0F1A644Bb9881f675Ef266CeC15a63a3d47',
      customFeed: '0xFF64785Ee22D764F8E79812102d3Fa7f2d3437Af',
      dataFeed: '0xed4ff96DAF37a0A44356E81A3cc22908B3f06B40',
      depositVault: '0x30FBc82A72CA674AA250cd6c27BCca1Fe602f1Bb',
      redemptionVaultSwapper: '0xDaC1b058cE42b67Ba33DbfDBA972d76C83C085D6',
    },
  },
  etherlink: {
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    paymentTokens: {
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
    mRE7: {
      token: '0x733d504435a49FC8C4e9759e756C2846c92f0160',
      customFeed: '0x1989329b72C1C81E5460481671298A5a046f3B8E',
      dataFeed: '0x82d4F923214959C84Cf026f727cA6C9FCa6B4454',
      depositVault: '0xBEf85e71EcD0517D0C1446751667891b04860753',
      redemptionVaultSwapper: '0xb24056AE566e24E35De798880E2dC28e2130De90',
    },
    mSL: {
      token: '0x86fc2Be8eE946AFB4c7D8a9Cc8b95E175D8a74A0',
      customFeed: '0xbECb6eDDC52b5ddC83A1239D4377558BB660473E',
      dataFeed: '0x5B08BC0D0881Bd4Eabe744845c9BdeD23a2E2931',
      depositVault: '0x80D8226fE5D67803AB2D9d56EE184f7C6C6692e5',
      redemptionVaultSwapper: '0x9645e020e7E3eD2400739702efDaa50F52C22aBa',
    },
    mLIQUIDITY: {
      token: '0xBFB153B24f43A6DE976dfB18b247c96FA777db39',
      customFeed: '0x210d76D5e29382318e0B778144413e92B7a41816',
      dataFeed: '0x8A0cE979acAaD48B372c7692Dd79BBa8259caf2C',
      depositVault: '0x70449bbB9e6bee4D1a53151940148F21026d50b9',
      redemptionVault: '0xE14Dbe39D750e24729df95e5F7c93b0E37C65004',
    },
  },
  zerog: {
    accessControl: '0x4512b664E798376eBC1CCAaC9Abb9bf2a899dCDb',
    paymentTokens: {
      usdc: {
        token: '0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E',
        aggregator: '0x6f57Ff507735BcD3d86af83aF77ABD10395b2904',
        dataFeed: '0x7a65EeEe73823F6E5D75b0B0245c8909D7bD8ae0',
      },
    },
    mEDGE: {
      token: '0xA1027783fC183A150126b094037A5Eb2F5dB30BA',
      customFeed: '0xC0a696cB0B56f6Eb20Ba7629B54356B0DF245447',
      dataFeed: '0xcbf46Aa4b5bAe5850038D9dF4661a58e85CEDC7e',
      depositVault: '0x72a93168AE79F269DeB2b1892F2AFd7eaa800271',
      redemptionVaultSwapper: '0x9dae503014edc48A4d8FE789f22c70Ae650eb79B',
    },
    mMEV: {
      token: '0xF465D564C03153AFBa6b973a6f0a6732a0b8015c',
    },
    mRE7: {
      token: '0xb1C5aF66208f0ed11bD794561d3e9C6E19984C1e',
    },
  },
  tac: {
    accessControl: '0x2365D68d462e9a5660a3208f817519334a706A45',
    mEDGE: {
      token: '0x0e07999AFFF029894277C785857b4cA30ec07a5e',
    },
  },
  plasma: {
    paymentTokens: {
      usdt0: {
        token: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb',
        aggregator: '0x70b77FcdbE2293423e41AdD2FB599808396807BC',
        dataFeed: '0xDA56C2dafAf034B7Bb490FAb19162E2dD2e62404',
      },
      plusd: {
        token: '0xf91c31299E998C5127Bc5F11e4a657FC0cF358CD',
        aggregator: '0x4718e64C12cAE76552696934f0b346cfc1e9a7d3',
        dataFeed: '0x2b3F3514867cbCcfadC80121297BB8088c683432',
      },
    },
    accessControl: '0x3eA351249daA640f4ABABc06B3118F35324Fab72',
    plUSD: {
      token: '0xf91c31299E998C5127Bc5F11e4a657FC0cF358CD',
      customFeed: '0x4718e64C12cAE76552696934f0b346cfc1e9a7d3',
      dataFeed: '0x2b3F3514867cbCcfadC80121297BB8088c683432',
      depositVault: '0x2b690Cab819A815732544aEb422474EfDc1B0615',
      redemptionVaultSwapper: '0x24e49D2Ad8f0bcD0cF7F2A5Ab560Ca4319f6bd75',
    },
    splUSD: {
      token: '0x616185600989Bf8339b58aC9e539d49536598343',
      customFeed: '0xfE5AE64f5Ba6a45B9267A5BA274620539Fa59566',
      dataFeed: '0xAA24bABA4DA60b2Aeaf80B1Db07B0A4A7fd84455',
      depositVault: '0x4Ef9fF56162bD3Cb5073FB20DbD355C59084093f',
      redemptionVaultSwapper: '0x69EcaB6aA7bDFDdD99deF0891c0317076430ae50',
    },
  },
  sepolia: {
    paymentTokens: {
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
      usds: {
        aggregator: '0x0e0eb6cdad90174f1Db606EC186ddD0B5eD80847',
        token: '0xf62A22b9487efB5E286486b3b237a11b49EeE2dF',
        dataFeed: '0x20226607b4fa64228ABf3072Ce561d6257683464',
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
      customFeed: '0x1E2165801d84865587252155Fb4580381f7A3FC4',
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
    mFONE: {
      token: '0x6Ee5Bcb946499a926332cdE1993986bE76BE58Ea',
      customFeed: '0xBFB6B9C88a56A5B1B33c9E3f1860B12e6520D5F8',
      dataFeed: '0x349c2d5Dbea2D0C59dE1D627D49233f0E1fC4e52',
      depositVault: '0xb73d1e0AEdcD5BbEcA0119E88288204101411E89',
      redemptionVaultSwapper: '0xE9dFA00a0aFcbA840BB6B1EA48767C93b963d86b',
    },
    hbUSDT: {
      token: '0x43881B05C3BE68B2d33eb70aDdF9F666C5005f68',
      customFeed: '0x92004DCC5359eD67f287F32d12715A37916deCdE',
      dataFeed: '0xbA9FD2850965053Ffab368Df8AA7eD2486f11024',
      depositVault: '0x6Be2f55816efd0d91f52720f096006d63c366e98',
      redemptionVaultSwapper: '0x9aEBf5d6F9411BAc355021ddFbe9B2c756BDD358',
    },
    hbXAUt: {
      token: '0x0d1C52C7cd203e4F84d084a33A062C61D51762fC',
      customFeed: '0x489a797714708cf088D158714a376d8FF740d701',
      dataFeed: '0x6808E4D8ADD893D0227690F435e1ff734d9CcdF4',
      depositVault: '0xCE41173A54d7f22e08d5800C627F17cB62e01afC',
      redemptionVaultSwapper: '0xF4376c15559052d35D4efff05EA20D06f7718324',
    },
    mLIQUIDITY: {
      token: '0x649f8698068ad143A7e18Ba9cb0Be112D5986AEb',
      customFeed: '0xc470e9fC12A60F72C543516dC23de1F55C29E3D5',
      dataFeed: '0xc4fB4B8641ac466758Dc05276c00EB570F587ED1',
      depositVault: '0x15A4c3E5a3e955A81A570e617D83680f57EE3862',
      redemptionVault: '0x30aCCEeDFf97A3fe11aB52EE7425Af4589338C06',
    },
    hypeETH: {
      token: '0x8Cf94465f8Db8A273673dFe950Bd1c9e34442aAB',
      customFeed: '0xc665f0C1d2EADbCBb65bE08a05E0B9a170b9a0b4',
      dataFeed: '0xfEE6365E6C4dBd77CEC9740234A03D65b7ee6950',
      depositVault: '0xAc79Fed395C2238C4fA13084EE440E19e4dEB0FE',
      redemptionVaultSwapper: '0xaA192F810106B6161cbe5FE531289C0e3B196DEB',
    },
    hypeBTC: {
      token: '0x091074f37e8C72Ddb8720AfaE77c44A855080e8A',
      customFeed: '0x54E5b341770c34Af6bc5645415036fF2D5b3d871',
      dataFeed: '0xa7eA8D927f99F0d1Ab2c8006Df40fa7c437D8606',
      depositVault: '0x3d09a1c088C6b8B971FF5F5D29C79C4cDbF45b04',
      redemptionVaultSwapper: '0xF0C91Bbae7f67c4e595d723ef5FB38B59F2008cf',
    },
    hypeUSD: {
      token: '0x48E284D0729EB1925066307072758d95dbBb49C4',
      customFeed: '0x8c7400777bD4B05864f21c446f6a3e996BC047d2',
      dataFeed: '0x39F0507060c12bB88cb68a496544011D2f341455',
      depositVault: '0x2ddC913e4C7674A7E42c55db48a92c47158E91C6',
      redemptionVaultSwapper: '0x5572Eb7f4fB679Ff6A99203f12B0484dC1062d78',
    },
    tUSDe: {
      token: '0x091F974e277A19485B9A713AC768850bc5AF383b',
      customFeed: '0xFb28042FA2Ab1752060C33D7F7c753348D0EF23E',
      dataFeed: '0xeb6A96967549cA5DC8F96E2198b9F36933e10148',
      depositVault: '0x1D9953C4E85e6d249520e8fF2b134E5dED875615',
      redemptionVaultSwapper: '0xE3EEe3e0D2398799C884a47FC40C029C8e241852',
    },
    tETH: {
      token: '0x7B9A4eE7C64d0f5593D3b6eA0bd98DF06578c151',
      customFeed: '0xEcdFD5942eb5f7f16C612616E9B551adC7940270',
      dataFeed: '0x3f5E04A7E8DE96955ef0774F29858D05c630a855',
      depositVault: '0x906D241DF94CfCC7b0796C0841737d489B224A9d',
      redemptionVaultSwapper: '0x48f42C2dfc8560Af244a5a2F5Ddba02F877ca724',
    },
    tBTC: {
      token: '0x75515E49fC93e3EE157cF7581c4Edc3715754De9',
      customFeed: '0xd0402B29d7BbAfeBbCeE32970cAC3A5234B8515d',
      dataFeed: '0x3549f6936dafb87f456dca3A061Bc9225Ff44B3C',
      depositVault: '0x807f2CF75EC43b11De43a529A0Dd9FEF754a9801',
      redemptionVaultSwapper: '0x313C76eCd990B728681f29464978D5637Cb78164',
    },
    timelock: '0x74e0a55Ea3Db85F6106FFD69Ef7c9829fd130888',
    accessControl: '0xbf25b58cB8DfaD688F7BcB2b87D71C23A6600AaC',
  },
  tacTestnet: {
    accessControl: '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B',
    paymentTokens: {
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

export const sanctionListContracts: Partial<Record<number, string>> = {
  [chainIds.main]: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  [chainIds.arbitrum]: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  [chainIds.base]: '0x3A91A31cB3dC49b4db9Ce721F50a9D076c8D739B',
};

export const ustbContracts: Partial<Record<number, string>> = {
  [chainIds.main]: '0x43415eB6ff9DB7E26A15b704e7A3eDCe97d31C4e',
};

export const getCurrentAddresses = (hre: HardhatRuntimeEnvironment) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (midasAddressesPerNetwork as any)[hre.network.name] as
    | MidasAddresses
    | undefined;
};
