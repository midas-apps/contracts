import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { ccipNetworkConfig, Network } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getMTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const currentNetwork = hre.network.name as Network;

  const addresses = getCurrentAddresses(hre);

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses || !mTokenAddresses.token) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const factory = await hre.ethers.getContractFactory(
    'MidasCCTBurnMintTokenPool',
    deployer,
  );

  const ccipConfig = ccipNetworkConfig?.[currentNetwork];

  if (!ccipConfig) {
    throw new Error('CCIP config not found');
  }

  const args = [
    mTokenAddresses.token,
    ccipConfig.rmnProxy,
    ccipConfig.router,
  ] as readonly [string, string, string];

  const contract = await factory.deploy(...args);

  logDeploy('MidasCCTBurnMintTokenPool', undefined, contract.address);

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, contract.address, ...args);
};

export default func;
