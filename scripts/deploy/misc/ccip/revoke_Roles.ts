import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getRolesForToken } from '../../../../helpers/roles';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);
  const mTokenAddresses = addresses?.[mToken];

  if (
    !mTokenAddresses ||
    !mTokenAddresses.token ||
    !mTokenAddresses.ccip?.tokenPool
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const roles = getRolesForToken(mToken);

  const contract = await hre.ethers.getContractAt(
    'MidasAccessControl',
    addresses.accessControl!,
    deployer,
  );

  const rolesToRevoke = [roles.minter, roles.burner];

  const tx = await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.revokeRoleMult(
      rolesToRevoke,
      rolesToRevoke.map(() => mTokenAddresses.ccip?.tokenPool ?? ''),
    ),
    {
      action: 'update-ac',
      subAction: 'revoke-token-roles',
      comment: `revoke ${mToken} ccip cct token pool roles`,
    },
  );

  console.log('Tx is submitted', tx);
};

export default func;
