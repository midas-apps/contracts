import { BigNumberish, constants } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { DeploymentConfig } from './types';
import { getNetworkConfig } from './utils';

import {
  M_BASIS_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  M_BASIS_REDEMPTION_VAULT_CONTRACT_NAME,
  M_BTC_REDEMPTION_VAULT_CONTRACT_NAME,
  M_RE7_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  M_EDGE_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  REDEMPTION_VAULT_BUIDL_CONTRACT_NAME,
  REDEMPTION_VAULT_CONTRACT_NAME,
  M_MEV_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  TAC_M_BTC_REDEMPTION_VAULT_CONTRACT_NAME,
  TAC_M_EDGE_REDEMPTION_VAULT_CONTRACT_NAME,
  TAC_M_MEV_REDEMPTION_VAULT_CONTRACT_NAME,
  MTokenName,
  M_SL_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  HB_USDT_REDEMPTION_VAULT_SWAPPER_CONTRACT_NAME,
  M_FONE_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  chainIds,
} from '../../../config';
import {
  getCurrentAddresses,
  RedemptionVaultType,
  sanctionListContracts,
} from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
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
  minAmount: BigNumberish;
  fiatAdditionalFee: BigNumberish;
  fiatFlatFee: BigNumberish;
  minFiatRedeemAmount: BigNumberish;
  requestRedeemer?: string;
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

const rvContractNamePerToken: Record<
  MTokenName,
  Partial<Record<DeployRvConfig['type'], string>>
> = {
  mBASIS: {
    REGULAR: M_BASIS_REDEMPTION_VAULT_CONTRACT_NAME,
    SWAPPER: M_BASIS_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  },
  mTBILL: {
    REGULAR: REDEMPTION_VAULT_CONTRACT_NAME,
    BUIDL: REDEMPTION_VAULT_BUIDL_CONTRACT_NAME,
  },
  mBTC: {
    REGULAR: M_BTC_REDEMPTION_VAULT_CONTRACT_NAME,
  },
  mEDGE: {
    SWAPPER: M_EDGE_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  },
  mRE7: {
    SWAPPER: M_RE7_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  },
  mMEV: {
    SWAPPER: M_MEV_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  },
  mSL: {
    SWAPPER: M_SL_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  },
  hbUSDT: {
    SWAPPER: HB_USDT_REDEMPTION_VAULT_SWAPPER_CONTRACT_NAME,
  },
  mFONE: {
    SWAPPER: M_FONE_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
  },
  TACmBTC: {
    REGULAR: TAC_M_BTC_REDEMPTION_VAULT_CONTRACT_NAME,
  },
  TACmEDGE: {
    REGULAR: TAC_M_EDGE_REDEMPTION_VAULT_CONTRACT_NAME,
  },
  TACmMEV: {
    REGULAR: TAC_M_MEV_REDEMPTION_VAULT_CONTRACT_NAME,
  },
};

const DUMMY_ADDRESS = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';

export const deployRedemptionVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  type: 'rv' | 'rvBuidl' | 'rvSwapper',
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);
  const tokenAddresses = addresses?.[token];

  const networkConfig = getNetworkConfig(hre, token, type);

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  const contractName = rvContractNamePerToken[token]?.[networkConfig.type];

  if (!contractName) {
    throw new Error('Unsupported token/type combination');
  }

  const vaultFactory = await hre.ethers.getContractFactory(contractName);

  console.log(`Deploying RV ${contractName}...`);

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
        : networkConfig.liquidityProvider ?? owner.address;

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
      feeReceiver: networkConfig.feeReceiver ?? owner.address,
      tokensReceiver: networkConfig.tokensReceiver ?? owner.address,
    },
    {
      instantDailyLimit: networkConfig.instantDailyLimit,
      instantFee: networkConfig.instantFee,
    },
    sanctionsList,
    networkConfig.variationTolerance,
    networkConfig.minAmount,
    {
      fiatAdditionalFee: networkConfig.fiatAdditionalFee,
      fiatFlatFee: networkConfig.fiatFlatFee,
      minFiatRedeemAmount: networkConfig.minFiatRedeemAmount,
    },
    networkConfig.requestRedeemer ?? owner.address,
    ...extraParams,
  ] as
    | Parameters<RedemptionVault['initialize']>
    | Parameters<
        RedemptionVaultWIthBUIDL['initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)']
      >
    | Parameters<
        MBasisRedemptionVaultWithSwapper['initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)']
      >;

  const deployment = await hre.upgrades.deployProxy(
    vaultFactory.connect(owner),
    params,
    {
      unsafeAllow: ['constructor'],
      initializer:
        networkConfig.type === 'SWAPPER'
          ? 'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
          : networkConfig.type === 'BUIDL'
          ? 'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)'
          : 'initialize',
    },
  );

  console.log('Deployed RV:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, 'RV', deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
