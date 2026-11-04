import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { executeTimeLockUpdateDelayTx } from '../deploy/common/timelock';
import { DeployFunction } from '../deploy/common/types';

const func: DeployFunction = async (
  hre: HardhatRuntimeEnvironment,
  action: string,
  _skipValidation?: boolean,
) => {
  await executeTimeLockUpdateDelayTx(hre, action);
};

export default func;
