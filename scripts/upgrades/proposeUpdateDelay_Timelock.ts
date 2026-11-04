import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { proposeTimeLockUpdateDelayTx } from '../deploy/common/timelock';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await proposeTimeLockUpdateDelayTx(hre, action);
};

export default func;
