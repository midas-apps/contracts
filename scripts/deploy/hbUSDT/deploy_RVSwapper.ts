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
  [chainIds.hyperevm]: {
    type: 'SWAPPER',
    feeReceiver: '0xb8A2d172fA08CD3b22aBa2Cb337F61A0e5762b74',
    tokensReceiver: '0xD317d8Bf73fCB1758bAA772819163B452D6e2b01',
    instantDailyLimit: parseUnits('1000000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.4', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x77930A9cd3Db2A9e49f730Db8743bece140260C9',
    liquidityProvider: '0x77930A9cd3Db2A9e49f730Db8743bece140260C9', // dummy address
    mTbillRedemptionVault: '0x77930a9cd3db2a9e49f730db8743bece140260c9', // dummy address
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'hbUSDT', networkConfig);
};

func(hre).then(console.log).catch(console.error);
