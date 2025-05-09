import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { chainIds } from '../../../config';
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
  },
  [chainIds.base]: {
    type: 'REGULAR',
    feeReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    tokensReceiver: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0.1'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0xE4D0BCF0732d18aE0b213424647608bac8006824',
  },
  [chainIds.oasis]: {
    type: 'REGULAR',
    feeReceiver: '0x65d005E9A4496A0DbaD8AE32716e96759cFA4a0a',
    tokensReceiver: '0xB5Fc37f67B116e955beA2A0D07Dd1aeB381fb17f',
    instantDailyLimit: parseUnits('5000000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x4B6BDDDaF751E5E6B441B3c851B4f87719D661D2',
  },
  [chainIds.rootstock]: {
    type: 'REGULAR',
    feeReceiver: '0x560f45bded546653a1206b19c6c1fb5231eb73ce',
    tokensReceiver: '0x21bcaae49dd15943f9403b4a1b8dc72a29618e88',
    instantDailyLimit: parseUnits('5000000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0xf6a88ac1ca66332346cb859b9bc672fc74816c98',
  },
  [chainIds.arbitrum]: {
    type: 'REGULAR',
    feeReceiver: '0x0B831fAc838E3752F99D70C2b00532CeDC393DAB',
    tokensReceiver: '0xd375cA22d63bf0408C5967Cc08Cc656A76791653',
    instantDailyLimit: parseUnits('5000000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x0B6968D937D9435d093F6cF38362047c3F44e3bc',
  },
  [chainIds.plume]: {
    type: 'REGULAR',
    feeReceiver: '0x831c65a1AF585D88B56dF730A7CC00e805B49Fd2',
    tokensReceiver: '0x63e000C7Ed1E2036Ef7a5297ACFDfE6d79606a34',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.5', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x8c89ddB8E8c64325Ea2728828e7b1185C89EfE9c',
  },
  [chainIds.etherlink]: {
    type: 'REGULAR',
    feeReceiver: '0x831c65a1AF585D88B56dF730A7CC00e805B49Fd2',
    tokensReceiver: '0x63e000C7Ed1E2036Ef7a5297ACFDfE6d79606a34',
    instantDailyLimit: parseUnits('1000'),
    instantFee: parseUnits('0.07', 2),
    minAmount: parseUnits('0'),
    variationTolerance: parseUnits('0.1', 2),
    fiatAdditionalFee: parseUnits('0.1', 2),
    fiatFlatFee: parseUnits('30', 18),
    minFiatRedeemAmount: parseUnits('1000', 18),
    requestRedeemer: '0x8c89ddB8E8c64325Ea2728828e7b1185C89EfE9c',
  },
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const networkConfig = configs[hre.network.config.chainId!];

  await deployRedemptionVault(hre, 'mTBILL', networkConfig);
};

func(hre).then(console.log).catch(console.error);
