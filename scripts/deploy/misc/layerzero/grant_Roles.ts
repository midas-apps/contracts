import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getRolesForToken } from '../../../../helpers/roles';
import { getMTokenOrThrow, logDeploy } from '../../../../helpers/utils';
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
    !mTokenAddresses.layerZero?.oftAdapter
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const roles = getRolesForToken(mToken);

  const contract = await hre.ethers.getContractAt(
    'MidasAccessControl',
    addresses.accessControl!,
    deployer,
  );

  const rolesToGrant = [roles.minter, roles.burner];

  const tx = await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.grantRoleMult(rolesToGrant, [
      mTokenAddresses.layerZero.oftAdapter!,
      mTokenAddresses.layerZero.oftAdapter!,
    ]),
    {
      action: 'update-ac',
      subAction: 'grant-token-roles',
      comment: `grant required ${mToken} layerzero roles`,
    },
  );

  console.log('Tx is submitted', tx);
};

export default func;
