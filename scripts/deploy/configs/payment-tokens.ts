import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { PaymentTokenDeploymentConfig } from '../common/types';

export const paymentTokenDeploymentConfigs: PaymentTokenDeploymentConfig = {
  networkConfigs: {
    [chainIds.sepolia]: {
      usdt: {
        layerZero: {
          delegate: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
        },
      },
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
    [chainIds.arbitrumSepolia]: {
      usdt: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99', 8),
          maxAnswer: parseUnits('1.01', 8),
        },
        customAggregator: {
          description: 'USDT/USD',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        layerZero: {
          delegate: '0xa0819ae43115420beb161193b8D8Ba64C9f9faCC',
        },
        postDeploy: {
          setRoundData: {
            data: parseUnits('1', 8),
          },
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
      tbtc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
          description: 'tBTC/BTC',
        },
      },
      syrupusdc: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: 1120779318388135788n,
          maxAnswer: parseUnits('1.5', 18),
        },
      },
      syrupusdt: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1.091390', 6),
          maxAnswer: parseUnits('1.250000', 6),
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
      usdhl: {
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
      wsthype: {
        dataFeed: {
          minAnswer: parseUnits('1.00767018', 8),
          maxAnswer: parseUnits('1.03767018', 8),
          healthyDiff: 86400,
        },
      },
      khype: {
        dataFeed: {
          minAnswer: parseUnits('0.999', 8),
          maxAnswer: parseUnits('1.03', 8),
          healthyDiff: 6 * 3600,
        },
      },
      whype: {
        customAggregator: {
          description: 'wHYPE/HYPE',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
      },
      usdc: {
        dataFeed: {
          healthyDiff: 6 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
      behype: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('1', 18),
          maxAnswer: parseUnits('1.02', 18),
        },
      },
      ubtc: {
        dataFeed: {
          numerator: {
            healthyDiff: 6 * 3600,
            minAnswer: 1,
            maxAnswer: constants.MaxInt256,
          },
          denominator: {
            healthyDiff: 6 * 3600,
            minAnswer: 1,
            maxAnswer: constants.MaxInt256,
          },
          feedType: 'composite',
          minAnswer: parseUnits('0.987'),
          maxAnswer: parseUnits('1.013'),
        },
      },
    },
    [chainIds.katana]: {
      usol: {
        customAggregator: {
          description: 'USOL/SOL',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
      },
      jitosol: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('1.218324664671500500', 18),
          maxAnswer: parseUnits('1.306653202860184320', 18),
        },
      },
      miusd: {
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        customAggregator: {
          description: 'miUSD/miUSD',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        postDeploy: {
          setRoundData: {
            data: parseUnits('1', 8),
          },
        },
      },
      vbusdc: {
        customAggregator: {
          description: 'USD/USD',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        dataFeed: {
          numerator: {
            minAnswer: parseUnits('0.99999', 8),
            maxAnswer: parseUnits('1', 8),
            healthyDiff: constants.MaxUint256,
          },
          denominator: {
            minAnswer: parseUnits('0.999', 8),
            maxAnswer: parseUnits('1.42857142', 8),
            healthyDiff: days(1),
          },
          feedType: 'composite',
          minAnswer: parseUnits('0.7', 18),
          maxAnswer: parseUnits('1.001', 18),
        },
        postDeploy: {
          setRoundData: {
            data: parseUnits('1', 8),
          },
        },
      },
      vbusdt: {
        customAggregator: {
          description: 'USD/USD',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        dataFeed: {
          numerator: {
            minAnswer: parseUnits('0.99999', 8),
            maxAnswer: parseUnits('1', 8),
            healthyDiff: constants.MaxUint256,
          },
          denominator: {
            minAnswer: parseUnits('0.999', 8),
            maxAnswer: parseUnits('1.42857142', 8),
            healthyDiff: days(1),
          },
          feedType: 'composite',
          minAnswer: parseUnits('0.7', 18),
          maxAnswer: parseUnits('1.001', 18),
        },
      },
    },
    [chainIds.xrplevm]: {
      xrp: {
        customAggregator: {
          description: 'XRP/XRP',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.1', 18),
          maxAnswer: parseUnits('1000', 18),
        },
        postDeploy: {
          setRoundData: {
            data: parseUnits('1', 8),
          },
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
    [chainIds.tac]: {
      ton: {
        customAggregator: {
          description: 'TON/TON',
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
          maxAnswerDeviation: parseUnits('0', 8),
        },
        dataFeed: {
          healthyDiff: constants.MaxUint256,
          minAnswer: parseUnits('0.99999', 8),
          maxAnswer: parseUnits('1', 8),
        },
        postDeploy: {
          setRoundData: {
            data: parseUnits('1', 8),
          },
        },
      },
    },
    [chainIds.zerog]: {
      usdc: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60,
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
    [chainIds.plasma]: {
      usdt0: {
        dataFeed: {
          healthyDiff: 24 * 60 * 60, // FIXME: update when get a value
          minAnswer: parseUnits('0.997', 8),
          maxAnswer: parseUnits('1.003', 8),
        },
      },
    },
  },
};
