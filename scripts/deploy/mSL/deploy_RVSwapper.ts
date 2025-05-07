import { expect } from 'chai';
import chalk from 'chalk';
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
    mTbillRedemptionVault:
      midasAddressesPerNetwork.sepolia?.mTBILL?.redemptionVaultBuidl ?? '',
  },
  [chainIds.main]: {
    type: 'SWAPPER',
    feeReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    tokensReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x3d26843969702f7961A7952A304aE5CFa1010fCe',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.main?.mTBILL?.redemptionVaultBuidl ?? '',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.base]: {
    type: 'SWAPPER',
    feeReceiver: '0x6ccb0b29De830C51270e4FB9BDE8b1754A94B554',
    tokensReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x3d26843969702f7961A7952A304aE5CFa1010fCe',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.base?.mTBILL?.redemptionVault ?? '',
  },
  [chainIds.plume]: {
    type: 'SWAPPER',
    feeReceiver: '0x6ccb0b29De830C51270e4FB9BDE8b1754A94B554',
    tokensReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.3', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x3d26843969702f7961A7952A304aE5CFa1010fCe',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.plume?.mTBILL?.redemptionVault ?? '0x',
  },
  [chainIds.etherlink]: {
    type: 'SWAPPER',
    feeReceiver: '0x6ccb0b29De830C51270e4FB9BDE8b1754A94B554',
    tokensReceiver: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.8', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x3d26843969702f7961A7952A304aE5CFa1010fCe',
    liquidityProvider: '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.etherlink?.mTBILL?.redemptionVault ?? '0x',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mSL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
