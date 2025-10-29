import { MTokenName, Network, PartialConfigPerNetwork } from '../types';

type ConfigPerNetwork<TKey extends string> = Partial<
  Record<
    TKey,
    {
      linkedNetworks: Network[];
    }
  >
>;

export const itsConfigPerMToken: PartialConfigPerNetwork<
  ConfigPerNetwork<MTokenName>
> = {
  sepolia: {
    mTBILL: {
      linkedNetworks: ['arbitrumSepolia'],
    },
  },
};
