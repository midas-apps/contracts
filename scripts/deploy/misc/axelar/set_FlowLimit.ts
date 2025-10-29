import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { axelarTokenManagerAbi } from '../../../../helpers/axelar';
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
    !mTokenAddresses.axelar?.manager
  ) {
    throw new Error('mToken addresses not found or missing required fields');
  }

  const roles = getRolesForToken(mToken);

  const contract = await hre.ethers.getContractAt(
    axelarTokenManagerAbi,
    mTokenAddresses.axelar?.manager,
    deployer,
  );

  console.log(await contract.flowLimit());

  await sendAndWaitForCustomTxSign(
    hre,
    await contract.populateTransaction.setFlowLimit(parseUnits('1000000')),
    {
      action: 'axelar-wire-tokens', // TODO: change to correct action
      comment: `set axelar flow limits for ${mToken}`,
    },
  );
};

export default func;
