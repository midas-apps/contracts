import { BigNumberish, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { deployAndVerifyProxy, getDeployer, getNetworkConfig } from './utils';

import { MTokenName } from '../../../config';
import {
  getCurrentAddresses,
  RedemptionVaultType,
  sanctionListContracts,
} from '../../../config/constants/addresses';
import { getTokenContractNames } from '../../../helpers/contracts';
import {
  MBasisRedemptionVaultWithSwapper,
  RedemptionVault,
  RedemptionVaultWIthBUIDL,
} from '../../../typechain-types';

export type DeployRvConfigCommon = {
  feeReceiver?: string;
  tokensReceiver?: string;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  enableSanctionsList?: boolean;
  variationTolerance: BigNumberish;
  requestRedeemer?: string;
  /**
   * @default 0
   */
  minAmount?: BigNumberish;
  /**
   * @default 0.1
   */
  fiatAdditionalFee?: BigNumberish;
  /**
   * @default 30
   */
  fiatFlatFee?: BigNumberish;
  /**
   * @default 1000
   */
  minFiatRedeemAmount?: BigNumberish;
};

export type DeployRvRegularConfig = {
  type: 'REGULAR';
} & DeployRvConfigCommon;

export type DeployRvBuidlConfig = {
  type: 'BUIDL';
  buidlRedemption: string;
  minBuidlBalance: BigNumberish;
  minBuidlToRedeem: BigNumberish;
} & DeployRvConfigCommon;

type SwapperVault =
  | {
      mToken: MTokenName;
      redemptionVaultType: RedemptionVaultType;
    }
  | 'dummy';

export type DeployRvSwapperConfig = {
  type: 'SWAPPER';
  swapperVault: SwapperVault;
  liquidityProvider?: `0x${string}` | 'dummy';
} & DeployRvConfigCommon;

export type DeployRvConfig =
  | DeployRvRegularConfig
  | DeployRvBuidlConfig
  | DeployRvSwapperConfig;

const DUMMY_ADDRESS = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

export const deployRedemptionVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  type: 'rv' | 'rvBuidl' | 'rvSwapper',
) => {
  const addresses = getCurrentAddresses(hre);
  const deployer = await getDeployer(hre);
  const tokenAddresses = addresses?.[token];

  const networkConfig = getNetworkConfig(hre, token, type);

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  const contractName = getTokenContractNames(token)[type];

  if (!contractName) {
    throw new Error('Unsupported token/type combination');
  }

  const extraParams: unknown[] = [];

  if (networkConfig.type === 'BUIDL') {
    extraParams.push(networkConfig.buidlRedemption);
    extraParams.push(networkConfig.minBuidlToRedeem);
    extraParams.push(networkConfig.minBuidlBalance);
  } else if (networkConfig.type === 'SWAPPER') {
    const swapperVault = networkConfig.swapperVault;

    let swapperVaultAddress: string | undefined;

    if (swapperVault === 'dummy') {
      swapperVaultAddress = DUMMY_ADDRESS;
    } else {
      swapperVaultAddress =
        addresses[swapperVault.mToken]?.[swapperVault.redemptionVaultType];
    }

    if (!swapperVaultAddress) {
      throw new Error('Swapper vault address is not found');
    }

    if (swapperVaultAddress === DUMMY_ADDRESS) {
      console.log('Using dummy swapper vault address');
    }

    const liquidityProvider =
      networkConfig.liquidityProvider === 'dummy'
        ? DUMMY_ADDRESS
        : networkConfig.liquidityProvider ?? deployer.address;

    extraParams.push(swapperVaultAddress);
    extraParams.push(liquidityProvider);
  }

  let dataFeed: string | undefined;

  if (token.startsWith('TAC')) {
    const originalTokenName = token.replace('TAC', '');
    dataFeed = addresses?.[originalTokenName as MTokenName]?.dataFeed;
    console.log(
      `Detected TAC wrapper, will be used data feed from ${originalTokenName}: ${dataFeed}`,
    );
  } else {
    dataFeed = tokenAddresses?.dataFeed;
  }

  const sanctionsList = networkConfig.enableSanctionsList
    ? sanctionListContracts[hre.network.config.chainId!]
    : constants.AddressZero;

  if (!sanctionsList) {
    throw new Error('Sanctions list address is not found');
  }

  const params = [
    addresses?.accessControl,
    {
      mToken: tokenAddresses?.token,
      mTokenDataFeed: dataFeed,
    },
    {
      feeReceiver: networkConfig.feeReceiver ?? deployer.address,
      tokensReceiver: networkConfig.tokensReceiver ?? deployer.address,
    },
    {
      instantDailyLimit: networkConfig.instantDailyLimit,
      instantFee: networkConfig.instantFee,
    },
    sanctionsList,
    networkConfig.variationTolerance,
    networkConfig.minAmount ?? parseUnits('0', 18),
    {
      fiatAdditionalFee:
        networkConfig.fiatAdditionalFee ?? parseUnits('0.1', 2),
      fiatFlatFee: networkConfig.fiatFlatFee ?? parseUnits('30', 18),
      minFiatRedeemAmount:
        networkConfig.minFiatRedeemAmount ?? parseUnits('1000', 18),
    },
    networkConfig.requestRedeemer ?? deployer.address,
    ...extraParams,
  ] as
    | Parameters<RedemptionVault['initialize']>
    | Parameters<
        RedemptionVaultWIthBUIDL['initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)']
      >
    | Parameters<
        MBasisRedemptionVaultWithSwapper['initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)']
      >;

  await deployAndVerifyProxy(hre, contractName, params, undefined, {
    initializer:
      networkConfig.type === 'SWAPPER'
        ? 'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
        : networkConfig.type === 'BUIDL'
        ? 'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)'
        : 'initialize',
  });
};
