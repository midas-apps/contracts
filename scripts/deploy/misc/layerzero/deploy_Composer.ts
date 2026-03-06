import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  getMTokenOrThrow,
  getPaymentTokenOrThrow,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { deployAndVerifyProxy } from '../../common/utils';
import {
  defaultDepositVaultPriority,
  resolveVaultAddress,
  routingRedemptionVaultPriority,
} from '../../common/vault-resolver';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const pToken = getPaymentTokenOrThrow(hre);
  const addresses = getCurrentAddresses(hre);

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses) {
    throw new Error('mToken addresses not found');
  }

  if (!mTokenAddresses.layerZero?.oft) {
    throw new Error('mToken layerzero adapter not found');
  }

  const depositVault = resolveVaultAddress(
    mTokenAddresses,
    defaultDepositVaultPriority,
  );
  if (!depositVault) {
    throw new Error('Deposit vault not found');
  }

  const redemptionVault = resolveVaultAddress(
    mTokenAddresses,
    routingRedemptionVaultPriority,
  );
  if (!redemptionVault) {
    throw new Error('Redemption vault not found');
  }

  const pTokenOft = addresses?.paymentTokens?.[pToken]?.layerZero?.oft;

  if (!pTokenOft) {
    throw new Error('pToken OFT not found');
  }

  await deployAndVerifyProxy(hre, 'MidasLzVaultComposerSync', [], undefined, {
    unsafeAllow: ['state-variable-immutable'],
    constructorArgs: [
      depositVault,
      redemptionVault,
      pTokenOft,
      mTokenAddresses.layerZero.oft,
    ],
  });
};

export default func;
