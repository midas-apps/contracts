import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getRolesForToken } from '../../../../helpers/roles';
import { getMTokenOrThrow, logDeploy } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);
  const mTokenAddresses = addresses?.[mToken];

  if (
    !mTokenAddresses ||
    !mTokenAddresses.token ||
    !mTokenAddresses.layerZero?.minterBurner ||
    !mTokenAddresses.layerZero?.mintBurnAdapter
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const roles = getRolesForToken(mToken);

  const contract = await hre.ethers.getContractAt(
    'MidasAccessControl',
    addresses.accessControl!,
    deployer,
  );

  const rolesToGrant = [roles.minter, roles.burner, roles.layerZero.adapter];

  // TODO: send it trough safe
  const tx = await contract.revokeRoleMult(rolesToGrant, [
    mTokenAddresses.layerZero.minterBurner,
    mTokenAddresses.layerZero.minterBurner,
    mTokenAddresses.layerZero.mintBurnAdapter!,
  ]);

  logDeploy('Revoke roles tx', undefined, tx.hash);

  console.log('Waiting for tx to be confirmed...');
  await tx.wait(3);
};

export default func;
