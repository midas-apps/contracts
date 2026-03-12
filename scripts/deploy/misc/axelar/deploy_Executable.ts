import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { axelarItsAddress } from '../../../../helpers/axelar';
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

  if (!mTokenAddresses.axelar?.tokenId) {
    throw new Error('mToken axelar tokenId is not found');
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

  const pTokenId = addresses?.paymentTokens?.[pToken]?.axelar?.tokenId;

  if (!pTokenId) {
    throw new Error('pToken tokenId not found');
  }

  await deployAndVerifyProxy(hre, 'MidasAxelarVaultExecutable', [], undefined, {
    unsafeAllow: ['state-variable-immutable', 'constructor'],
    constructorArgs: [
      depositVault,
      redemptionVault,
      pTokenId,
      mTokenAddresses.axelar?.tokenId,
      axelarItsAddress,
    ],
  });
};

export default func;
