import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import { midasAddressesPerNetwork } from '../../../config/constants/addresses';
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  [chainIds.sepolia]: {
    type: 'SWAPPER',
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('0.1', 18),
    minFiatRedeemAmount: parseUnits('1', 18),
    requestRedeemer: undefined,
    liquidityProvider: undefined,
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.main]: {
    type: 'SWAPPER',
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
    liquidityProvider: '0x38C25B85BC5F9Dac55F974e4eE4A895961418267',
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.base]: {
    type: 'SWAPPER',
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
    liquidityProvider: '0xD7c27BCF825094a1732a83369Ca9475aE702522b',
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.arbitrum]: {
    type: 'SWAPPER',
    feeReceiver: '0xF9C2E91d6d43B2A7e7c4A9dDb3E56564F1a7f7d4',
    tokensReceiver: '0xc93437a52aF5190C536ce6d994331f2Cc3e44E18',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x9ffFe9FcE62204de42aE91b965b44062c0f3c70F',
    liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.plume]: {
    type: 'SWAPPER',
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x0527fb945257Ee3B6821D8E3CF0AB60Cb74c5a47',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.77', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.77', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x45E8D67683E93F9A265932Dcf4b7Aa41cd16786c',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVault',
    },
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mEDGE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
