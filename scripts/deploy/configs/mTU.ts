import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mTUDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.1', 8),
      description: 'mTU/USD',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      postDeploy: {
        grantRoles: {
          tokenManagerAddress: '0x4A133c636aa68376DDf6fDD65181Dfb7a16D4341',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0xbb038940E5089B0E624c6a95C89819Ad9ec2D6dA',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
