import { hbUSDTDeploymentConfig } from './hbUSDT';
import { mBASISDeploymentConfig } from './mBASIS';
import { mBTCDeploymentConfig } from './mBTC';
import { mEDGEDeploymentConfig } from './mEDGE';
import { mFONEDeploymentConfig } from './mFONE';
import { mLIQUIDITYDeploymentConfig } from './mLIQUIDITY';
import { mMEVDeploymentConfig } from './mMEV';
import { mRE7DeploymentConfig } from './mRE7';
import { mSLDeploymentConfig } from './mSL';
import { mTBILLDeploymentConfig } from './mTBILL';
import { TACmBTCDeploymentConfig } from './tac/TACmBTC';
import { TACmEDGEDeploymentConfig } from './tac/TACmEDGE';
import { TACmMEVDeploymentConfig } from './tac/TACmMEV';

import { MTokenName } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const configsPerToken: Partial<Record<MTokenName, DeploymentConfig>> = {
  mTBILL: mTBILLDeploymentConfig,
  mLIQUIDITY: mLIQUIDITYDeploymentConfig,
  mBASIS: mBASISDeploymentConfig,
  mSL: mSLDeploymentConfig,
  hbUSDT: hbUSDTDeploymentConfig,
  mBTC: mBTCDeploymentConfig,
  mEDGE: mEDGEDeploymentConfig,
  mFONE: mFONEDeploymentConfig,
  mMEV: mMEVDeploymentConfig,
  mRE7: mRE7DeploymentConfig,
  TACmBTC: TACmBTCDeploymentConfig,
  TACmEDGE: TACmEDGEDeploymentConfig,
  TACmMEV: TACmMEVDeploymentConfig,
};
