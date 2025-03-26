import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  chainIds,
  TAC_M_BTC_DEPOSIT_VAULT_CONTRACT_NAME,
  TAC_M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME,
} from '../../../../config';
import { deployDepositVault, DeployDvConfig } from '../../common';
import { midasAddressesPerNetwork } from '../../../../config/constants/addresses';

const configs: Record<number, DeployDvConfig> = {
  [chainIds.sepolia]: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0.001'),
    minAmount: parseUnits('0.00001'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.main]: {
    feeReceiver: '0xC7549dA15C20b50f305979b091C8a76dB2ba5f37',
    tokensReceiver: midasAddressesPerNetwork?.main?.TACmEDGE?.redemptionVault!,
    instantDailyLimit: parseUnits('10000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.3', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(
    hre,
    await hre.ethers.getContractFactory(TAC_M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME),
    'TACmEDGE',
    networkConfig,
  );
};

func(hre).then(console.log).catch(console.error);
