import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

  const deployer = await getDeployer(hre);
  const addresses = getCurrentAddresses(hre);

  const network = hre.network.name as Network;

  const tokenAddresses = addresses?.[mToken];

  if (!tokenAddresses?.token) {
    throw new Error('token address is not found');
  }

  const poolAddress = tokenAddresses?.ccip?.tokenPool;

  if (!poolAddress) {
    throw new Error('pool address is not found');
  }

  const fallbackEscrow = tokenAddresses?.ccip?.fallbackEscrow;

  if (!fallbackEscrow) {
    throw new Error('fallback escrow address is not found');
  }

  const contract = await hre.ethers.getContractAt(
    'MidasCCTBurnMintTokenPool',
    poolAddress,
    deployer,
  );

  await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.setFallbackReceiver(fallbackEscrow),
    {
      action: 'update-ccip',
    },
    await contract.owner(),
  );
};

export default func;
