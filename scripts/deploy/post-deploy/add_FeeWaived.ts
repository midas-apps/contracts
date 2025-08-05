import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getMTokenOrThrow } from '../../../helpers/utils';
import { addFeeWaived } from '../common/common-vault';
import { DeployFunction } from '../common/types';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  await addFeeWaived(hre, mToken);
};

export default func;
