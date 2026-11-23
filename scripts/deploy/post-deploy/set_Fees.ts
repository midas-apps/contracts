import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, PaymentTokenName } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { getChainOrThrow } from '../../../helpers/utils';
import { ManageableVault } from '../../../typechain-types';
import { DeployFunction } from '../common/types';
import {
  getContractAt,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../common/utils';
import { getDeploymentTokenAddresses } from '../configs/deployment-profiles';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const { networkName } = getChainOrThrow(hre);

  const setFees = getNetworkConfig(hre, mToken, 'postDeploy')?.setFees;

  if (!setFees) {
    console.log(`No setFees config found for ${networkName} network`);
    return;
  }

  const addresses = getCurrentAddresses(hre);
  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses) {
    throw new Error(`Token addresses not found for ${mToken}`);
  }

  const mergedTokenAddresses = getDeploymentTokenAddresses(
    tokenAddresses,
    mToken,
    hre.deploymentConfig,
  );

  for (const [vaultType, fees] of Object.entries(setFees)) {
    const vaultAddress =
      mergedTokenAddresses[vaultType as keyof typeof mergedTokenAddresses];
    if (!vaultAddress || typeof vaultAddress !== 'string') {
      throw new Error(`${vaultType} address not found for ${mToken}`);
    }

    const vault = (await getContractAt(
      hre,
      'ManageableVault',
      vaultAddress,
    )) as ManageableVault;

    const send = async (
      label: string,
      current: BigNumber,
      target: BigNumber,
      populate: () => ReturnType<
        ManageableVault['populateTransaction']['setInstantFee']
      >,
    ) => {
      console.log(`${mToken} ${vaultType} ${label}: ${current} -> ${target}`);
      if (current.eq(target)) {
        console.log('already set, skipping');
        return;
      }

      const txRes = await sendAndWaitForCustomTxSign(hre, await populate(), {
        mToken,
        comment: `set ${label} to ${target}bps in ${mToken} ${vaultType}`,
        action: 'update-vault',
      });
      console.log(`${label} tx initiated`, txRes);
    };

    if (fees.instantFee !== undefined) {
      const target = BigNumber.from(fees.instantFee);
      await send('instant fee', await vault.instantFee(), target, () =>
        vault.populateTransaction.setInstantFee(target),
      );
    }

    for (const [token, fee] of Object.entries(fees.tokenFees ?? {})) {
      const tokenAddress =
        addresses?.paymentTokens?.[token as PaymentTokenName]?.token;
      if (!tokenAddress) {
        throw new Error(`Payment token ${token} address not found`);
      }

      const { dataFeed, fee: current } = await vault.tokensConfig(tokenAddress);
      if (BigNumber.from(dataFeed).isZero()) {
        throw new Error(`${token} is not a payment token of ${vaultType}`);
      }

      const target = BigNumber.from(fee);
      await send(`${token} token fee`, current, target, () =>
        vault.populateTransaction.changeTokenFee(tokenAddress, target),
      );
    }
  }
};

export default func;
