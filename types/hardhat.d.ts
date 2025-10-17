import { TransactionResponse } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';
import { EIP1193Provider } from 'hardhat/types';

import {
  MTokenName,
  PaymentTokenName,
  Network as MidasNetwork,
} from '../config/types';
import { Logger } from '../helpers/logger';

import 'hardhat/types/runtime';

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mtoken?: MTokenName;
    layerZero?: {
      originalNetwork?: MidasNetwork;
    };
    paymentToken?: PaymentTokenName;
    action?: string;
    skipValidation?: boolean;
    aggregatorType?: 'numerator' | 'denominator';
    logger: Logger & {
      // default: false
      logToFile: boolean;
      // default: logs/
      logsFolderPath: string;
      executionLogContext: string;
    };
    customSigner?: {
      getWeb3Provider: (params: {
        chainId: number;
        rpcUrl?: string;
        action: string;
      }) => Promise<EIP1193Provider>;
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
          chainId?: number;
        },
      ) => Promise<
        | { type: 'hardhatSigner'; tx: TransactionResponse }
        | { type: 'customSigner'; payload: unknown }
      >;
    };
  }
}
