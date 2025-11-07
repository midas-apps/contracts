import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import { chainIds } from '../../../config';
import { DeploymentConfig } from '../common/types';

export const mHyperETHDeploymentConfig: DeploymentConfig = {
  genericConfigs: {
    customAggregator: {
      maxAnswerDeviation: parseUnits('0.34', 8),
      description: 'mHyperETH/ETH',
    },
    dataFeed: {},
  },
  networkConfigs: {
    [chainIds.main]: {
      dv: {
        type: 'REGULAR',
        enableSanctionsList: true,
        feeReceiver: '0x3280FC3E3e01efAc23bbf7079B912A2D753a60E2',
        tokensReceiver: '0x91064C84Bd85C0532a9371815001C439230EA958',
        instantDailyLimit: parseUnits('5000', 18),
        instantFee: parseUnits('0', 2),
        variationTolerance: parseUnits('0.4', 2),
        minMTokenAmountForFirstDeposit: parseUnits('30', 18),
        maxSupplyCap: parseUnits('10000', 18),
      },
      rvSwapper: {
        type: 'SWAPPER',
        feeReceiver: '0x537C351C374b013F4db9bbe2b078803EcFfc6d54',
        tokensReceiver: '0x91064C84Bd85C0532a9371815001C439230EA958',
        requestRedeemer: '0xd2d25A3fC2356E1535C740e39b5199E633886abD',
        instantDailyLimit: parseUnits('1000', 18),
        instantFee: parseUnits('0.5', 2),
        variationTolerance: parseUnits('0.4', 2),
        liquidityProvider: 'dummy',
        enableSanctionsList: true,
        swapperVault: 'dummy',
      },
      postDeploy: {
        addPaymentTokens: {
          vaults: [
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('10000', 18),
                },
              ],
              type: 'depositVault',
            },
            {
              paymentTokens: [
                {
                  token: 'weth',
                  allowance: parseUnits('10000', 18),
                },
              ],
              type: 'redemptionVaultSwapper',
            },
          ],
        },
        grantRoles: {
          tokenManagerAddress: '0x92BF5492edd7C96df074C7987f81c1bd2bCD8E94',
          vaultsManagerAddress: '0x2ACB4BdCbEf02f81BF713b696Ac26390d7f79A12',
          oracleManagerAddress: '0x398Bb437bbcFab65aDE182DEC4226CE56624C623',
        },
        setRoundData: {
          data: parseUnits('1', 8),
        },
        pauseFunctions: {
          redemptionVaultSwapper: [
            'redeemFiatRequest',
            'redeemInstant',
            'redeemInstantWithCustomRecipient',
            'redeemRequest',
            'redeemRequestWithCustomRecipient',
          ],
        },
      },
    },
  },
};
