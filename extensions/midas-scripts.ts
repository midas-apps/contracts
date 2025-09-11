import { TransactionResponse } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';

import { MTokenName, PaymentTokenName } from '../config/types';

import 'hardhat/types/runtime';
import 'hardhat/types/config';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mtoken?: MTokenName;
    paymentToken?: PaymentTokenName;
    action?: string;
    skipValidation?: boolean;
    aggregatorType?: 'numerator' | 'denominator';
    logger: {
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
    getNamedAccounts: () => Promise<{
      [name: string]: string;
    }>;
  }
}
