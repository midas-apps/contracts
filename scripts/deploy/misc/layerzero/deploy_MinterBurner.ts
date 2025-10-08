import { group, select, spinner } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getTokenContractNames } from '../../../../helpers/contracts';
import {
  etherscanVerifyImplementation,
  getMTokenOrThrow,
  logDeployProxy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { deployProxy } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);

  const contractNames = getTokenContractNames(mToken);

  const mTokenAddresses = addresses?.[mToken];

  if (!mTokenAddresses) {
    throw new Error('mToken addresses not found');
  }

  const contract = await deployProxy(
    hre,
    contractNames.layerZero.minterBurner,
    [addresses?.accessControl, mTokenAddresses.token],
  );

  await logDeployProxy(
    hre,
    contractNames.layerZero.minterBurner,
    contract.address,
  );

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerifyImplementation(hre, contract.address);
};

export default func;
