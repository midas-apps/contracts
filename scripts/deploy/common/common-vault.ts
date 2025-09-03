import { Provider } from '@ethersproject/providers';
import { BigNumber, BigNumberish, constants, Signer } from 'ethers';
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
      fee?: BigNumberish;
      // default: infinite
      allowance?: BigNumberish;
    }[];
  }[];
};

export type AddFeeWaivedConfig = {
  fromVault: {
    mToken: MTokenName;
    type: VaultType;
  };
  toWaive: (
    | {
        // default: hre.mtoken
        mToken?: MTokenName;
        type: VaultType;
      }
    | string
  )[];
}[];

export const addFeeWaived = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const { addFeeWaived: networkConfig } = getNetworkConfig(
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
  await foreachFeeWaiveAddress(
    hre,
    provider,
    token,
    networkConfig,
    async (vaultType, _, __, ___, feeWaiveLabel) => {
      console.log(
        `successfully simulated ${feeWaiveLabel} processing for ${vaultType}`,
      );
    },
  );

  await foreachFeeWaiveAddress(
    hre,
    provider,
    token,
    networkConfig,
    async (
      vaultType,
      vaultMToken,
      vaultContract,
      feeWaiveAddress,
      feeWaiveLabel,
    ) => {
      const waived = await vaultContract.waivedFeeRestriction(feeWaiveAddress!);

      if (waived) {
        console.log('Fee is already waived, skipping...', feeWaiveAddress);
        return;
      }

      const tx = await vaultContract.populateTransaction.addWaivedFeeAccount(
        feeWaiveAddress!,
      );

      const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'add-fee-waived',
        comment: `waive fee for ${feeWaiveLabel} in ${vaultMToken} ${vaultType}`,
        mToken: vaultMToken,
      });

      console.log(`${vaultType} tx initiated`, txRes);
    },
  );
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
        paymentToken.allowance ?? constants.MaxUint256,
        paymentToken.isStable ?? true,
      );

      const txRes = await sendAndWaitForCustomTxSign(hre, tx, {
        action: 'update-vault',
        subAction: 'add-payment-token',
        comment: `add ${paymentToken.token} to ${token} ${vaultType}`,
      });

      console.log(`${vaultType}:${paymentToken.token} tx initiated`, txRes);
    },
  );
};

const foreachFeeWaiveAddress = async (
  hre: HardhatRuntimeEnvironment,
  provider: Provider | Signer,
  token: MTokenName,
  networkConfig: AddFeeWaivedConfig,
  callback?: (
    vaultType: VaultType,
    vaultMToken: MTokenName,
    vaultContract: ManageableVault,
    feeWaiveAddress: string,
    feeWaiveLabel: string,
  ) => Promise<void>,
) => {
  const addresses = getCurrentAddresses(hre);

  for (const vault of networkConfig) {
    const vaultContract = await getVaultContract(
      hre,
      provider,
      vault.fromVault.mToken,
      vault.fromVault.type,
    );

    for (const toWaive of vault.toWaive) {
      const address =
        typeof toWaive === 'string'
          ? toWaive
          : addresses?.[toWaive.mToken ?? token]?.[toWaive.type];

      if (!address) {
        throw new Error('Invalid address to waive');
      }

      await callback?.(
        vault.fromVault.type,
        vault.fromVault.mToken,
        vaultContract,
        address,
        typeof toWaive === 'string'
          ? toWaive
          : `${toWaive.mToken ?? token} ${toWaive.type}`,
      );
    }
  }
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
