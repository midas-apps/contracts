import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getAllRoles, getRolesForToken } from '../../../../helpers/roles';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const mToken = getMTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);
  const mTokenAddresses = addresses?.[mToken];

  const config = getNetworkConfig(hre, mToken, 'postDeploy');
  const escrowAdmin = config?.ccip?.escrowAdmin;

  if (!escrowAdmin) {
    throw new Error('escrow admin address is not found');
  }

  if (
    !mTokenAddresses ||
    !mTokenAddresses.token ||
    !mTokenAddresses.ccip?.tokenPool ||
    !mTokenAddresses.ccip.fallbackEscrow
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const roles = getRolesForToken(mToken);

  const allRoles = getAllRoles();

  const contract = await hre.ethers.getContractAt(
    'MidasAccessControl',
    addresses.accessControl!,
    deployer,
  );

  const rolesToRevoke = [
    roles.minter,
    roles.burner,
    roles.greenlisted,
    roles.greenlisted,
    allRoles.common.escrowAdmin,
  ];

  const tx = await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.revokeRoleMult(rolesToRevoke, [
      mTokenAddresses.ccip.tokenPool,
      mTokenAddresses.ccip.tokenPool,
      mTokenAddresses.ccip.tokenPool,
      mTokenAddresses.ccip.fallbackEscrow,
      escrowAdmin,
    ]),
    {
      action: 'update-ac',
      subAction: 'revoke-token-roles',
      comment: `revoke ${mToken} CCIP pool and escrow roles`,
    },
  );

  console.log('Tx is submitted', tx);
};

export default func;
