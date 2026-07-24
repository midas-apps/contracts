import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { MTokenName } from '../../../config';
import { addFeeWaived } from '../common/common-vault';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  await addFeeWaived(hre, mToken);
};

export default func;
