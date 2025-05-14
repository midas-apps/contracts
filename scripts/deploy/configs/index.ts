import { mTBILLDeploymentConfig } from './mTBILL';

import { MTokenName } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const configsPerToken: Partial<Record<MTokenName, DeploymentConfig>> = {
  mTBILL: mTBILLDeploymentConfig,
};
