import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const kitBTCDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.21', 8),
      description: 'kitBTC/BTC',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.hyperevm]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: false,
        feeReceiver: '0x1D640dCCb96C7bAB349D2d2441D688f44721424C',
        tokensReceiver: '0xC22A4729105c265f34CC69f2de06848499919C30',
        instantDailyLimit: parseUnits('1000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0xbd8852970F3e3E91d7D23a9BD948b6c563025687',
        tokensReceiver: '0xC22A4729105c265f34CC69f2de06848499919C30',
        requestRedeemer: '0x61edb727748D3fEbfcC5B2F83a03108d54255c97',
        instantDailyLimit: parseUnits('200', 18),
        instantFee: parseUnits('0.3', 2),
        variationTolerance: parseUnits('0.4', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: false,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          // kitBTC TODO: add uBTC for both vaults
          vaults: [
            {
              paymentTokens: [],
              type: 'depositVault',
            },
            {
              paymentTokens: [],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x4688326d89456062Cff2D631c167C730e679aD3B',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x8c64fB05032e31692B86FC7C1B85815446E03bf1',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
      },
    },
  },
};
