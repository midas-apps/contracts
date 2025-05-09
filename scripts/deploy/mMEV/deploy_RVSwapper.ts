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
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x745CaeAa070319cBfFF1AF29EF73bb594624d389',
    liquidityProvider: '0x2Dbb5eC76A17E13Ecb85b8483dc762642d3D07bf',
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
    enableSanctionsList: true,
  },
  [chainIds.base]: {
    type: 'SWAPPER',
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x745CaeAa070319cBfFF1AF29EF73bb594624d389',
    liquidityProvider: '0xD7c27BCF825094a1732a83369Ca9475aE702522b',
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.arbitrum]: {
    type: 'SWAPPER',
    feeReceiver: '0xceca5D043DAdc38Bcb2e1F13296254Cb4798019d',
    tokensReceiver: '0xE92A723af33A7aC8D54b6b1A0e1BF1Ca6E94231B',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x745CaeAa070319cBfFF1AF29EF73bb594624d389',
    liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
    swapperVault: {
      mToken: 'mBASIS',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.plume]: {
    type: 'SWAPPER',
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.77', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x0551390A7Dca6d0eb5089c1ba13300a2fbb12393',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
  [chainIds.etherlink]: {
    type: 'SWAPPER',
    feeReceiver: '0x6ccb0b29De830C51270e4FB9BDE8b1754A94B554',
    tokensReceiver: '0x1AA522B985FB76039A0c43b6f0eC0e30e490918e',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('1.5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x0551390A7Dca6d0eb5089c1ba13300a2fbb12393',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVaultSwapper',
    },
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mMEV', networkConfig);
};

func(hre).then(console.log).catch(console.error);
