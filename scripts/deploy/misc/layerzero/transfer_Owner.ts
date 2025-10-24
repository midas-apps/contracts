import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getMTokenOrPaymentTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, getNetworkConfig } from '../../common/utils';
import { paymentTokenDeploymentConfigs } from '../../configs/payment-tokens';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { mToken, paymentToken } = getMTokenOrPaymentTokenOrThrow(hre);

  const deployer = await getDeployer(hre);
  const addresses = getCurrentAddresses(hre);

  let address: string | undefined;
  let newOwner: string | undefined;

  if (mToken) {
    address = addresses?.[mToken]?.layerZero?.oft;
    const config = getNetworkConfig(hre, mToken, 'postDeploy');
    newOwner = config?.layerZero?.owner ?? config?.layerZero?.delegate;
  } else {
    address = addresses?.paymentTokens?.[paymentToken]?.layerZero?.oft;
    const config =
      paymentTokenDeploymentConfigs.networkConfigs[
        hre.network.config.chainId!
      ]?.[paymentToken]?.layerZero;

    newOwner = config?.owner ?? config?.delegate;
  }

  if (!address) {
    throw new Error('OFT address is not found');
  }

  if (!newOwner) {
    throw new Error('New owner is not found');
  }

  const contract = await hre.ethers.getContractAt('Ownable', address, deployer);

  const tx = await contract.transferOwnership(newOwner);

  console.log(`Tx is submitted, new owner will be ${newOwner}`);
  await tx.wait(5);
  console.log(`Tx is confirmed, new owner is ${newOwner}`);
};

export default func;
