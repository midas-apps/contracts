import { BigNumber } from 'ethers';

import { MTokenName, Network, PartialConfigPerNetwork } from '../types';

// TODO: move to networks config?
export const ccipNetworkConfig: PartialConfigPerNetwork<{
  chainSelector: BigNumber;
  router: string;
  rmnProxy: string;
  tokenAdminRegistry: string;
  registryModuleOwnerCustom: string;
  link: string;
}> = {
  sepolia: {
    chainSelector: BigNumber.from('16015286601757825753'),
    router: '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59',
    rmnProxy: '0xba3f6251de62dED61Ff98590cB2fDf6871FbB991',
    tokenAdminRegistry: '0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82',
    registryModuleOwnerCustom: '0x62e731218d0D47305aba2BE3751E7EE9E5520790',
    link: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  },
  arbitrumSepolia: {
    chainSelector: BigNumber.from('3478487238524512106'),
    router: '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165',
    rmnProxy: '0x9527E2d01A3064ef6b50c1Da1C0cC523803BCFF2',
    tokenAdminRegistry: '0x8126bE56454B628a88C17849B9ED99dd5a11Bd2f',
    registryModuleOwnerCustom: '0xE625f0b8b0Ac86946035a7729Aba124c8A64cf69',
    link: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E',
  },
};

type ConfigPerNetwork<TKey extends string> = Partial<
  Record<
    TKey,
    {
      linkedNetworks: Network[];

      /**
       * @default 'all'
       */
      pathways?: 'direct-only' | 'all';
    }
  >
>;

export const ccipConfigPerMToken: PartialConfigPerNetwork<
  ConfigPerNetwork<MTokenName>
> = {
  sepolia: {
    mTBILL: {
      linkedNetworks: ['arbitrumSepolia'],
    },
  },
};
