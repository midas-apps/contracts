import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const deployer = await getDeployer(hre);
  const tokenAddresses = getCurrentAddresses(hre)[mToken];
  const poolAddress = tokenAddresses?.ccip?.tokenPool;
  const fallbackEscrow = tokenAddresses?.ccip?.fallbackEscrow;

  if (!tokenAddresses?.token || !poolAddress || !fallbackEscrow) {
    throw new Error('CCIP token, pool, or fallback escrow is not found');
  }

  const pool = await hre.ethers.getContractAt(
    'MidasCCTBurnMintTokenPool',
    poolAddress,
    deployer,
  );
  const currentFallback = await pool.fallbackReceiver();
  if (currentFallback.toLowerCase() === fallbackEscrow.toLowerCase()) {
    console.log('CCIP fallback escrow is already linked');
    return;
  }
  if (currentFallback !== hre.ethers.constants.AddressZero) {
    throw new Error(
      `CCIP pool is already linked to another escrow: ${currentFallback}`,
    );
  }

  await sendAndWaitForCustomTxSign(
    hre,
    await pool.populateTransaction.setFallbackReceiver(fallbackEscrow),
    {
      action: 'update-ccip',
      mToken,
      comment: `link ${mToken} CCIP fallback escrow`,
    },
    await pool.owner(),
  );
};

export default func;
