import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds, DEPOSIT_VAULT_CONTRACT_NAME } from '../../../config';
import { midasAddressesPerNetwork } from '../../../config/constants/addresses';
import { deployDepositVault, DeployDvConfig } from '../common';

const configs: Record<number, DeployDvConfig> = {
  [chainIds.sepolia]: {
    feeReceiver: undefined,
    tokensReceiver: undefined,
    instantDailyLimit: constants.MaxUint256,
    instantFee: parseUnits('1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('100'),
    minAmount: parseUnits('0.01'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.main]: {
    feeReceiver: '0x875c06A295C41c27840b9C9dfDA7f3d819d8bC6A',
    tokensReceiver: '0x1Bd4d8D25Ec7EBA10e94BE71Fd9c6BF672e31E06',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('0.1', 2),
    sanctionsList: '0x40C57923924B5c5c5455c48D93317139ADDaC8fb',
  },
  [chainIds.base]: {
    feeReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    tokensReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.1', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.oasis]: {
    feeReceiver: '0x65d005E9A4496A0DbaD8AE32716e96759cFA4a0a',
    tokensReceiver: '0xB5Fc37f67B116e955beA2A0D07Dd1aeB381fb17f',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.rootstock]: {
    feeReceiver: '0x560f45bded546653a1206b19c6c1fb5231eb73ce',
    tokensReceiver: '0x21bcaae49dd15943f9403b4a1b8dc72a29618e88',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.arbitrum]: {
    feeReceiver: '0x0B831fAc838E3752F99D70C2b00532CeDC393DAB',
    tokensReceiver: '0xd375cA22d63bf0408C5967Cc08Cc656A76791653',
    instantDailyLimit: parseUnits('10000000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
  },
  [chainIds.plume]: {
    feeReceiver: '0x831c65a1AF585D88B56dF730A7CC00e805B49Fd2',
    tokensReceiver: midasAddressesPerNetwork.plume?.mTBILL?.redemptionVault,
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0', 2),
    minMTokenAmountForFirstDeposit: parseUnits('0'),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployDepositVault(hre, 'mTBILL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
