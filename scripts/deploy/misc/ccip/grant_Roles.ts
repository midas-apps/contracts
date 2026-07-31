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
    !mTokenAddresses.ccip?.tokenPool
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const tokenPool = mTokenAddresses.ccip.tokenPool!;

  const roles = getRolesForToken(mToken);

  const allRoles = getAllRoles();
  const contract = await hre.ethers.getContractAt(
    'MidasAccessControl',
    addresses.accessControl!,
    deployer,
  );

  const rolesToGrant = [
    roles.minter,
    roles.burner,
    allRoles.common.escrowAdmin,
  ];

  const tx = await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.grantRoleMult(rolesToGrant, [
      tokenPool,
      tokenPool,
      escrowAdmin,
    ]),
    {
      action: 'update-ac',
      subAction: 'grant-token-roles',
      comment: `grant required ${mToken} ccip cct token pool roles`,
    },
  );

  console.log('Tx is submitted', tx);
};

export default func;
