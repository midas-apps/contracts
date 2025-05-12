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
    type: 'REGULAR',
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
  },
  [chainIds.main]: {
    type: 'REGULAR',
    feeReceiver: '0x846E6379197074Ec2384bdb320bc947BB6E84Bb8',
    tokensReceiver: '0x89A4c184822823e4A284C50417733F4Bd0d8D716',
    instantDailyLimit: parseUnits('100000000'),
    instantFee: parseUnits('0', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.01', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30'),
    minFiatRedeemAmount: parseUnits('1000'),
    requestRedeemer: '0x3d26843969702f7961A7952A304aE5CFa1010fCe',
    sanctionsList: '0x13E2c115B4b7B8Eae260431FcA10eBaF33fEa665',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mLIQUIDITY', networkConfig);
};

func(hre).then(console.log).catch(console.error);
