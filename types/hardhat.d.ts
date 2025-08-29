import { TransactionResponse } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';

import { MTokenName, PaymentTokenName } from '../config/types';
import { Logger } from '../helpers/logger';

import 'hardhat/types/runtime';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mtoken?: MTokenName;
    paymentToken?: PaymentTokenName;
    action?: string;
    skipValidation?: boolean;
    logger: Logger & {
      // default: false
      logToFile: boolean;
      // default: logs/
      logsFolderPath: string;
      executionLogContext: string;
    };
    customSigner?: {
      getWalletAddress: (
        action?: string,
        mtoken?: MTokenName,
      ) => Promise<string>;
      createAddressBookContract: (data: {
        address: string;
        contractName: string;
        contractTag?: string;
      }) => Promise<{ payload: unknown }>;
      sendTransaction: (
        transaction: {
          data: string;
          to: string;
          value?: BigNumberish;
        },
        txSignMetadata?: {
          comment?: string;
          action?: string;
          from?: string;
          mToken?: string;
        },
      ) => Promise<
        | { type: 'hardhatSigner'; tx: TransactionResponse }
        | { type: 'customSigner'; payload: unknown }
      >;
    };
  }
}
