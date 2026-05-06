import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../config/constants/addresses';
import { getTokenContractNames } from '../../helpers/contracts';
import { getMTokenOrThrow } from '../../helpers/utils';
import { DeployFunction } from '../deploy/common/types';
import { getDeployer } from '../deploy/common/utils';

/**
 * Upgrades a RedemptionVaultWithSwapper proxy to use the
 * RedemptionVaultWithMToken implementation.
 *
 * Usage:
 *   npx hardhat runscript scripts/upgrades/upgrade_RedemptionVaultMToken.ts --mtoken mFONE --network <network>
 *
 * The script uses `prepareUpgrade` which validates storage layout
 * compatibility and deploys the new implementation (if changed).
 */
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);
  const proxyAddress = addresses?.[mToken]?.redemptionVaultSwapper;

  if (!proxyAddress) {
    throw new Error(
      `No redemptionVaultSwapper address found for ${mToken} on chain ${hre.network.config.chainId}`,
    );
  }

  const deployer = await getDeployer(hre);
  const contractName = getTokenContractNames(mToken).rvMToken;

  console.log(
    `Upgrading ${mToken} Swapper proxy (${proxyAddress}) -> ${contractName}`,
  );

  const deployment = await hre.upgrades.prepareUpgrade(
    proxyAddress,
    await hre.ethers.getContractFactory(contractName, deployer),
    {
      redeployImplementation: 'onchange',
    },
  );

  if (typeof deployment !== 'string') {
    await deployment.wait(5);
    console.log('New implementation deployed at:', deployment.to);
  } else {
    console.log('Implementation address:', deployment);
  }
};

export default func;
