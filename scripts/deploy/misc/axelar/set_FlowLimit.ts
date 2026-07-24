import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { axelarTokenManagerAbi } from '../../../../helpers/axelar';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const deployer = await getDeployer(hre);

  const addresses = getCurrentAddresses(hre);
  const mTokenAddresses = addresses?.[mToken];

  if (
    !mTokenAddresses ||
    !mTokenAddresses.token ||
    !mTokenAddresses.axelar?.manager
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const config = getNetworkConfig(hre, mToken, 'postDeploy').axelarIts;

  if (!config) {
    throw new Error('Deployment config not found');
  }

  const flowLimit = config.flowLimit;

  if (!flowLimit) {
    throw new Error('Flow limit not found');
  }

  const contract = await hre.ethers.getContractAt(
    axelarTokenManagerAbi,
    mTokenAddresses.axelar?.manager,
    deployer,
  );

  await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.setFlowLimit(flowLimit),
    {
      action: 'axelar-update-config',
      comment: `set axelar flow limits for ${mToken}`,
    },
    config.operator,
  );
};

export default func;
