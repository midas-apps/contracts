import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName, PaymentTokenName } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { requireOneOfMTokenOrPaymentToken } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';
import { paymentTokenDeploymentConfigs } from '../../configs/payment-tokens';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken?: MTokenName,
  paymentToken?: PaymentTokenName,
) => {
  const selected = requireOneOfMTokenOrPaymentToken(mToken, paymentToken);

  const deployer = await getDeployer(hre);
  const addresses = getCurrentAddresses(hre);

  let address: string | undefined;
  let newOwner: string | undefined;

  if (selected.mToken) {
    address = addresses?.[selected.mToken]?.layerZero?.oft;
    const config = getNetworkConfig(hre, selected.mToken, 'postDeploy');
    newOwner = config?.layerZero?.owner ?? config?.layerZero?.delegate;
  } else {
    address = addresses?.paymentTokens?.[selected.paymentToken]?.layerZero?.oft;
    const config =
      paymentTokenDeploymentConfigs.networkConfigs[
        hre.network.config.chainId!
      ]?.[selected.paymentToken]?.postDeploy?.layerZero;

    newOwner = config?.owner ?? config?.delegate;
  }

  if (!address) {
    throw new Error('OFT address is not found');
  }

  if (!newOwner) {
    throw new Error('New owner is not found');
  }

  const contract = await hre.ethers.getContractAt('Ownable', address, deployer);

  await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.transferOwnership(newOwner),
    {
      action: 'deployer',
    },
    await contract.owner(),
  );
};

export default func;
