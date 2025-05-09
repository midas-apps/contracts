import { expect } from 'chai';
import chalk from 'chalk';
import { BigNumber, BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import { MBasisDepositVault } from '../../../typechain-types';
import { deployDepositVault, DeployDvConfig } from '../common';
import { deployRedemptionVault, DeployRvConfig } from '../common/rv';

const configs: Record<number, DeployRvConfig> = {
  11155111: {
    type: 'BUIDL',
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
    buidlRedemption: '0x4cb1479705EA6F0dD63415111aF56eaCfBa019bb', // mocked BUIDL redemption
    minBuidlBalance: parseUnits('250000', 18),
    minBuidlToRedeem: parseUnits('250000', 18),
  },
  1: {
    type: 'BUIDL',
    feeReceiver: '0x875c06A295C41c27840b9C9dfDA7f3d819d8bC6A',
    tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    enableSanctionsList: true,
    buidlRedemption: '0x31D3F59Ad4aAC0eeE2247c65EBE8Bf6E9E470a53',
    minBuidlBalance: parseUnits('1', 6),
    minBuidlToRedeem: parseUnits('1', 6),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mTBILL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
