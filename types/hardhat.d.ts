import { TransactionResponse } from '@ethersproject/providers';
import { BigNumberish } from 'ethers';
import { EIP1193Provider } from 'hardhat/types';

import type { VaultVersion } from '../config/constants/vaults';
import {
  MTokenName,
  PaymentTokenName,
  Network as MidasNetwork,
} from '../config/types';
import type { DeploymentConfigName } from '../scripts/deploy/configs/deployment-profiles';

import 'hardhat/types/runtime';

type CustomSignerTransaction = {
  data: string;
  to: string;
  value?: BigNumberish;
};

type CustomSignerResult =
  | { type: 'hardhatSigner'; tx: TransactionResponse }
  | { type: 'customSigner'; payload: unknown };

declare module 'hardhat/types/runtime' {
  export interface HardhatRuntimeEnvironment {
    mtoken?: MTokenName;
    layerZero?: {
      originalNetwork?: MidasNetwork;
    };
    paymentToken?: PaymentTokenName;
    action?: string;
    /** `--upgrade`: upgrade id (key of `upgradeConfigs.upgrades`) */
    upgradeId?: string;
    deploymentConfig?: DeploymentConfigName;
    skipValidation?: boolean;
    /**
     * Selects which vaults `getCurrentAddresses` exposes under base keys.
     * Set by `--vault-version` or fixed per task for v2-only scripts
     */
    vaultVersion?: VaultVersion;
    addressBookKeys?: string[];
    logger: {
      // default: false
      logToFile: boolean;
      // default: logs/
      logsFolderPath: string;
    };
    contextId: string;
    getCustomSigner: () => Promise<{
      type: 'hardhatSigner' | 'customSigner';
      getWeb3Provider: (params: { action: string }) => Promise<EIP1193Provider>;
      getWalletAddress: (
        action?: string,
        mtoken?: MTokenName,
        chainId?: number,
      ) => Promise<string>;
      createAddressBookContract: (data: {
        address: string;
        contractName: string;
        contractTag?: string;
        /**
         * propose an update of the name / chains of an existing record of
         * the address if they differ, instead of skipping it
         */
        updateExisting?: boolean;
      }) => Promise<{ payload: unknown }>;
      sendTransaction: (
        transaction: CustomSignerTransaction & { gasLimit?: number },
        txSignMetadata?: {
          comment?: string;
          action?: string;
          from?: string;
          mToken?: string;
          chainId?: number;
          idempotenceId?: string;
        },
      ) => Promise<CustomSignerResult>;
      /**
       * customSigner: creates a Safe proposal in backoffice.
       * hardhatSigner: the deployer executes it through a 1-of-1 Safe immediately
       */
      proposeSafeTransaction: (
        transaction: CustomSignerTransaction,
        metadata: { safe: string; comment?: string },
      ) => Promise<CustomSignerResult>;
    }>;
  }
}
