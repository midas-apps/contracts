import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getRolesForToken } from '../../../../helpers/roles';
import { DeployFunction } from '../../common/types';
import { getDeployer, sendAndWaitForCustomTxSign } from '../../common/utils';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const deployer = await getDeployer(hre);

  const addresses = getCurrentAddresses(hre);
  const mTokenAddresses = addresses?.[mToken];

  if (
    !mTokenAddresses ||
    !mTokenAddresses.token ||
    !mTokenAddresses.layerZero?.oft
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
      mTokenAddresses.layerZero.oft!,
      mTokenAddresses.layerZero.oft!,
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
