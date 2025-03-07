import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployRedemptionVault, DeployRvConfig } from '../common/rv';
import { chainIds } from '../../../config';
import { midasAddressesPerNetwork } from '../../../config/constants/addresses';

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
    mTbillRedemptionVault: '0x460cec7f88e7813D7b0a297160e6718D9fE33908',
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
    mTbillRedemptionVault: '0x0D89C1C4799353F3805A3E6C4e1Cbbb83217D123',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
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
    mTbillRedemptionVault:
      midasAddressesPerNetwork.base?.mBASIS?.redemptionVaultSwapper ?? '0x',
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
    mTbillRedemptionVault:
      midasAddressesPerNetwork.arbitrum?.mBASIS?.redemptionVaultSwapper ?? '0x',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mMEV', networkConfig);
};

func(hre).then(console.log).catch(console.error);
