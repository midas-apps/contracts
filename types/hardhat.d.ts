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
      }) => Promise<{ payload: unknown }>;
      sendTransaction: (
        transaction: {
          data: string;
          to: string;
          value?: BigNumberish;
          gasLimit?: number;
        },
        txSignMetadata?: {
          comment?: string;
          action?: string;
          from?: string;
          mToken?: string;
          chainId?: number;
          idempotenceId?: string;
        },
      ) => Promise<
        | { type: 'hardhatSigner'; tx: TransactionResponse }
        | { type: 'customSigner'; payload: unknown }
      >;
    }>;
  }
}
