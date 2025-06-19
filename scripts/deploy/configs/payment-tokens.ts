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
      xaut0: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99', 8),
          maxAnswer: parseUnits('1.01', 8),
        },
        customAggregator: {
          description: 'XAUt0/XAUt',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
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
      stone: {
        dataFeed: {
          healthyDiff: 6 * 60 * 60,
          minAnswer: parseUnits('1.0425108', 18),
          maxAnswer: parseUnits('1.081161', 18),
        },
      },
      weth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'WETH/ETH',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      cmeth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.06405951', 18),
          maxAnswer: parseUnits('1.10350861', 18),
        },
      },
      usde: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      susde: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.17454296', 18),
          maxAnswer: parseUnits('1.3', 18),
        },
      },
      weeth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.06856921', 18),
          maxAnswer: parseUnits('1.1', 18),
        },
      },
      rseth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.04717604', 18),
          maxAnswer: parseUnits('1.1', 18),
        },
      },
      rsweth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.03332344', 18),
          maxAnswer: parseUnits('1.1', 18),
        },
      },
      sweth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.08392731', 18),
          maxAnswer: parseUnits('1.2', 18),
        },
      },
      wsteth: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.1936797', 18),
          maxAnswer: parseUnits('1.3', 18),
        },
      },
      lbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'LBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      solvbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'solvBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      cbbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'cbBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      sbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'sBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      enzobtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'enzoBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      ebtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'eBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      swbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'swBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
        },
      },
      pumpbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          description: 'pumpBTC/BTC',
          maxAnswerDeviation: parseUnits('0', 8),
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
      xaut0: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99', 8),
          maxAnswer: parseUnits('1.01', 8),
        },
        customAggregator: {
          description: 'XAUt0/XAUt',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
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
