import { BigNumberish } from 'ethers';

import { MTokenName, PaymentTokenName } from '../config/types';

import 'hardhat/types/runtime';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mtoken?: MTokenName;
    paymentToken?: PaymentTokenName;
    customSigner?: {
      signTransaction: (
        transaction: {
          data: string;
          to: string;
          value?: BigNumberish;
        },
        txSignMetadata?: {
          comment?: string;
          action?: string;
          from?: string;
        },
      ) => Promise<
        | { type: 'hardhatSigner'; signedTx: string }
        | { type: 'customSigner'; payload: unknown }
      >;
    };
  }
}
