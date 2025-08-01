import { Provider } from '@ethersproject/providers';
import { BigNumber, constants, Signer } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from './utils';

import { MTokenName, PaymentTokenName } from '../../../config';
import {
  DataFeedAddresses,
  getCurrentAddresses,
  VaultType,
} from '../../../config/constants/addresses';
import { ManageableVault } from '../../../typechain-types';

export type AddPaymentTokensConfig = {
  vaults: {
    type: VaultType;
    paymentTokens: {
      token: PaymentTokenName;
      // default: true
      isStable?: boolean;
      // default: 0
      fee?: BigNumber;
    }[];
  }[];
};

export const addPaymentTokens = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const { addPaymentTokens: networkConfig } = getNetworkConfig(
    hre,
    token,
    'postDeploy',
  );

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  const provider = await getDeployer(hre);

  // simulation step to ensure that all the loop iterations wont fail on
  // simple checks step
  await foreachVaultPaymentToken(
    hre,
    provider,
    token,
    networkConfig,
    async (vaultType, _, __, paymentToken) => {
      console.log(
        `successfully simulated ${paymentToken.token} processing for ${vaultType}`,
      );
    },
  );

  await foreachVaultPaymentToken(
    hre,
    provider,
    token,
    networkConfig,
    async (vaultType, vaultContract, tokenConfig, paymentToken) => {
      const token = await vaultContract.tokensConfig(tokenConfig.token!);

      if (token.dataFeed !== constants.AddressZero) {
        console.log('Token is already added, skipping...', paymentToken.token);
        return;
      }

      const tx = await vaultContract.populateTransaction.addPaymentToken(
        tokenConfig.token!,
        tokenConfig.dataFeed!,
        paymentToken.fee ?? BigNumber.from(0),
        paymentToken.isStable ?? true,
      );

      const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'add-payment-token',
        comment: `add ${paymentToken.token} to ${vaultType}`,
      });

      console.log(`${vaultType}:${paymentToken.token} tx initiated: ${txRes}`);
    },
  );
};

const foreachVaultPaymentToken = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  token: MTokenName,
  networkConfig: AddPaymentTokensConfig,
  callback?: (
    vaultType: VaultType,
    vaultContract: ManageableVault,
    addresses: DataFeedAddresses,
    paymentToken: AddPaymentTokensConfig['vaults'][number]['paymentTokens'][number],
  ) => Promise<void>,
) => {
  const addresses = getCurrentAddresses(hre);

  for (const vault of networkConfig.vaults) {
    const vaultContract = await getVaultContract(
      hre,
      provider,
      token,
      vault.type,
    );

    for (const paymentToken of vault.paymentTokens) {
      const tokenConfig = addresses?.dataFeeds?.[paymentToken.token];

      if (!tokenConfig) {
        throw new Error('Token config is not found');
      }

      await callback?.(vault.type, vaultContract, tokenConfig, paymentToken);
    }
  }
};

const getVaultContract = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  mToken: MTokenName,
  vaultType: VaultType,
) => {
  const addresses = getCurrentAddresses(hre);

  const vaultAddress = addresses?.[mToken]?.[vaultType];

  if (!vaultAddress) {
    throw new Error('Vault address is not found');
  }

  return (
    await hre.ethers.getContractAt('ManageableVault', vaultAddress)
  ).connect(provider) as ManageableVault;
};
