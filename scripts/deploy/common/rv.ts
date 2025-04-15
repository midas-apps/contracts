import { BigNumberish, constants, ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

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
} from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
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
  sanctionsList?: string;
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

export type DeployRvSwapperConfig = {
  type: 'SWAPPER';
  mTbillRedemptionVault?: string;
  liquidityProvider?: string;
} & DeployRvConfigCommon;

export type DeployRvConfig =
  | DeployRvRegularConfig
  | DeployRvBuidlConfig
  | DeployRvSwapperConfig;

type TokenName =
  | 'mTBILL'
  | 'mBASIS'
  | 'mBTC'
  | 'mEDGE'
  | 'mRE7'
  | 'mMEV'
  | 'TACmBTC'
  | 'TACmEDGE'
  | 'TACmMEV';

export const deployRedemptionVault = async (
  hre: HardhatRuntimeEnvironment,
  token: TokenName,

  networkConfig?: DeployRvConfig,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);
  const tokenAddresses = addresses?.[token];

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  let vaultFactory: ContractFactory;

  // TODO: refactor this
  if (token === 'mBASIS') {
    if (networkConfig.type === 'REGULAR') {
      vaultFactory = await hre.ethers.getContractFactory(
        M_BASIS_REDEMPTION_VAULT_CONTRACT_NAME,
      );
    } else if (networkConfig.type === 'SWAPPER') {
      vaultFactory = await hre.ethers.getContractFactory(
        M_BASIS_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
      );
    } else {
      throw new Error('Cannot deploy buidl for mBASIS');
    }
  } else if (token === 'mTBILL') {
    if (networkConfig.type === 'REGULAR') {
      vaultFactory = await hre.ethers.getContractFactory(
        REDEMPTION_VAULT_CONTRACT_NAME,
      );
    } else if (networkConfig.type === 'BUIDL') {
      vaultFactory = await hre.ethers.getContractFactory(
        REDEMPTION_VAULT_BUIDL_CONTRACT_NAME,
      );
    } else {
      throw new Error('Cannot deploy swapper for mTBILL');
    }
  } else if (token === 'mBTC' || token === 'TACmBTC') {
    if (networkConfig.type === 'REGULAR') {
      vaultFactory = await hre.ethers.getContractFactory(
        token === 'mBTC'
          ? M_BTC_REDEMPTION_VAULT_CONTRACT_NAME
          : TAC_M_BTC_REDEMPTION_VAULT_CONTRACT_NAME,
      );
    } else {
      throw new Error('Unsupported vault type for mBTC');
    }
  } else if (token === 'mEDGE' || token === 'TACmEDGE') {
    if (token === 'mEDGE' && networkConfig.type === 'SWAPPER') {
      vaultFactory = await hre.ethers.getContractFactory(
        M_EDGE_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
      );
    } else if (token === 'TACmEDGE' && networkConfig.type === 'REGULAR') {
      vaultFactory = await hre.ethers.getContractFactory(
        TAC_M_EDGE_REDEMPTION_VAULT_CONTRACT_NAME,
      );
    } else {
      throw new Error('Cannot deploy a redeemer for a provided token');
    }
  } else if (token === 'mRE7') {
    if (networkConfig.type === 'SWAPPER') {
      vaultFactory = await hre.ethers.getContractFactory(
        M_RE7_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
      );
    } else {
      throw new Error('Cannot deploy regular redeemer for mRE7');
    }
  } else if (token === 'mMEV' || token === 'TACmMEV') {
    if (token === 'mMEV' && networkConfig.type === 'SWAPPER') {
      vaultFactory = await hre.ethers.getContractFactory(
        M_MEV_REDEMPTION_SWAPPER_VAULT_CONTRACT_NAME,
      );
    } else if (token === 'TACmMEV' && networkConfig.type === 'REGULAR') {
      vaultFactory = await hre.ethers.getContractFactory(
        TAC_M_MEV_REDEMPTION_VAULT_CONTRACT_NAME,
      );
    } else {
      throw new Error('Cannot deploy a redeemer for a provided token');
    }
  } else {
    throw new Error('Unsupported token type');
  }
  console.log('Deploying RV...');

  const extraParams: unknown[] = [];

  if (networkConfig.type === 'BUIDL') {
    extraParams.push(networkConfig.buidlRedemption);
    extraParams.push(networkConfig.minBuidlToRedeem);
    extraParams.push(networkConfig.minBuidlBalance);
  } else if (networkConfig.type === 'SWAPPER') {
    extraParams.push(
      networkConfig.mTbillRedemptionVault ?? addresses.mTBILL?.redemptionVault,
    );
    extraParams.push(networkConfig.liquidityProvider ?? owner.address);
  }

  let dataFeed: string | undefined;

  if (token.startsWith('TAC')) {
    const originalTokenName = token.replace('TAC', '');
    dataFeed = addresses?.[originalTokenName as TokenName]?.dataFeed;
    console.log(
      `Detected TAC wrapper, will be used data feed from ${originalTokenName}: ${dataFeed}`,
    );
  } else {
    dataFeed = tokenAddresses?.dataFeed;
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
    networkConfig.sanctionsList ?? constants.AddressZero,
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
