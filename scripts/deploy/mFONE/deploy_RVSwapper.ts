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
    feeReceiver: '0x0ff15C0555Add64e53E8c738176D896D489F1F6D',
    tokensReceiver: '0x86B16681E21E857A9a71a8FDfC33AB1eB8213b74',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.5', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.6', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x82FB69DD7f31eD9FF8A44579D674e5032A4adc9C',
    liquidityProvider: '0x4dc293e0d6BEfe6FCF9d1FFDEaA5266BD15C3071',
    mTbillRedemptionVault:
      midasAddressesPerNetwork.main?.mTBILL?.redemptionVaultBuidl ?? '',
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mFONE', networkConfig);
};

func(hre).then(console.log).catch(console.error);
