import { PopulatedTransaction } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { sendAndWaitForCustomTxSign } from './utils';

import { MTokenName } from '../../../config';
import { TokenAddresses, VaultType } from '../../../config/constants/addresses';

export type GreenlistConfig = Partial<Record<VaultType, boolean>>;

type SendTransaction = (
  hre: HardhatRuntimeEnvironment,
  transaction: PopulatedTransaction,
  metadata?: Parameters<typeof sendAndWaitForCustomTxSign>[2],
) => Promise<unknown>;

export const applyGreenlistConfig = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
  config: GreenlistConfig,
  addresses: TokenAddresses,
  sendTransaction: SendTransaction = sendAndWaitForCustomTxSign,
) => {
  for (const [vaultType, enabled] of Object.entries(config)) {
    const vaultAddress = addresses[vaultType as VaultType];
    if (!vaultAddress) continue;

    const vault = await hre.ethers.getContractAt(
      'ManageableVault',
      vaultAddress,
    );

    if ((await vault.greenlistEnabled()) === enabled) {
      console.log(
        `Greenlist for ${mToken} ${vaultType} is already ${
          enabled ? 'enabled' : 'disabled'
        }`,
      );
      continue;
    }

    const tx = await vault.populateTransaction.setGreenlistEnable(enabled);
    const txRes = await sendTransaction(hre, tx, {
      mToken,
      comment: `${
        enabled ? 'Enable' : 'Disable'
      } greenlist in ${mToken} ${vaultType}`,
      action: 'update-vault',
      subAction: 'set-greenlist-enabled',
    });

    console.log(
      `${enabled ? 'Enabled' : 'Disabled'} greenlist in ${mToken} ${vaultType}`,
      txRes,
    );
  }
};
