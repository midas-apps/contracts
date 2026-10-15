import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

  const deployer = await getDeployer(hre);
  const addresses = getCurrentAddresses(hre);

  const address = addresses?.[mToken]?.ccip?.tokenPool;
  const config = getNetworkConfig(hre, mToken, 'postDeploy');
  const newOwner = config?.ccip?.owner;

  if (!address) {
    throw new Error('pool address is not found');
  }

  if (!newOwner) {
    throw new Error('New owner is not found');
  }

  const contract = await hre.ethers.getContractAt(
    'MidasCCTBurnMintTokenPool',
    address,
    deployer,
  );

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
