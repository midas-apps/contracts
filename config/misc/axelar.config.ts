import {
  MTokenName,
  Network,
  PartialConfigPerNetwork,
  PaymentTokenName,
} from '../types';

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

export const itsConfigPerPToken: PartialConfigPerNetwork<
  ConfigPerNetwork<PaymentTokenName>
> = {
  sepolia: {
    usdt: {
      linkedNetworks: ['arbitrumSepolia'],
    },
  },
};
