import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { PaymentTokenDeploymentConfig } from '../common/types';

export const paymentTokenDeploymentConfigs: PaymentTokenDeploymentConfig = {
  networkConfigs: {
    [chainIds.sepolia]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      pusd: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99', 8),
          maxAnswer: parseUnits('1.1', 8),
        },
      },
      usds: {
        dataFeed: {
          healthyDiff: 365 * 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      wbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99', 8),
          maxAnswer: parseUnits('1.1', 8),
        },
      },
    },
    [chainIds.main]: {
      dai: {
        dataFeed: {
          healthyDiff: 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      m: {
        dataFeed: {
          healthyDiff: 365 * 10 * 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      usds: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      usdt: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      wbtc: {
        dataFeed: {
          healthyDiff: 12 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.base]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.oasis]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 18),
          maxAnswer: parseUnits('1.003', 18),
        },
      },
    },
    [chainIds.plume]: {
      pusd: {
        dataFeed: {
          healthyDiff: 60 * 60,
          minAnswer: parseUnits('0.997', 18),
          maxAnswer: parseUnits('1.003', 18),
        },
      },
    },
    [chainIds.rootstock]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      wrbtc: {
        dataFeed: {
          healthyDiff: 365 * 10 * 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.arbitrum]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.etherlink]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.hyperevm]: {
      usde: {
        dataFeed: {
          healthyDiff: 6 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      usdt: {
        dataFeed: {
          healthyDiff: 6 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      usr: {
        dataFeed: {
          healthyDiff: 6 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.tacTestnet]: {
      usdt: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
  },
};
