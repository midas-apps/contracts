import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
import { midasAddressesPerNetwork } from '../../../config/constants/addresses';
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  11155111: {
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
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVaultBuidl',
    },
  },
  1: {
    type: 'SWAPPER',
    feeReceiver: '0xB8633297f9D9A8eaD48f1335ab04b14C189639f0',
    tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('3', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    enableSanctionsList: true,
    liquidityProvider: '0x7388e98baCfFF1B3618d7d5bEbeDe483C9526FEd',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVaultBuidl',
    },
  },
  8453: {
    type: 'SWAPPER',
    feeReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    tokensReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('3', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    liquidityProvider: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVault',
    },
  },
  [chainIds.arbitrum]: {
    type: 'SWAPPER',
    feeReceiver: '0x6d4de22e3298963351475b32f6fa9fe97e867c4a',
    tokensReceiver: '0x1cd6be043852b91ea09660391b9928b015986246',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x3C5bbD59929940fF85E1Cf529627efb5B0E44764',
    liquidityProvider: '0x915E287EEa9594963B33FD12bF908312B5D860d2',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVault',
    },
  },
  [chainIds.plume]: {
    type: 'SWAPPER',
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x3ccE3cedf4d2AD8B699cc8B28Af12d4682347d32',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.6', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x5dbA0A717e9DCbD4a9168d65f1B3B98Eeb164379',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVault',
    },
  },
  [chainIds.etherlink]: {
    type: 'SWAPPER',
    feeReceiver: '0x6ccb0b29De830C51270e4FB9BDE8b1754A94B554',
    tokensReceiver: '0x6Dbd970a5FEDB83C503Caef98F15C1fcfc364072',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('1.5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x5dbA0A717e9DCbD4a9168d65f1B3B98Eeb164379',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    swapperVault: {
      mToken: 'mTBILL',
      redemptionVaultType: 'redemptionVault',
    },
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mBASIS', networkConfig);
};

func(hre).then(console.log).catch(console.error);
