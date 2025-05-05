import { BigNumberish, constants, ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  DEPOSIT_VAULT_CONTRACT_NAME,
  HB_USDT_DEPOSIT_VAULT_CONTRACT_NAME,
  M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME,
  M_BTC_DEPOSIT_VAULT_CONTRACT_NAME,
  M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME,
  M_MEV_DEPOSIT_VAULT_CONTRACT_NAME,
  M_RE7_DEPOSIT_VAULT_CONTRACT_NAME,
  M_SL_DEPOSIT_VAULT_CONTRACT_NAME,
  MTokenName,
  TAC_M_BTC_DEPOSIT_VAULT_CONTRACT_NAME,
  TAC_M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME,
  TAC_M_MEV_DEPOSIT_VAULT_CONTRACT_NAME,
} from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';
import {
  DepositVault,
  MBasisDepositVault,
  MBtcDepositVault,
} from '../../../typechain-types';

const dvContractNamePerToken: Record<MTokenName, string> = {
  mTBILL: DEPOSIT_VAULT_CONTRACT_NAME,
  mBASIS: M_BASIS_DEPOSIT_VAULT_CONTRACT_NAME,
  mBTC: M_BTC_DEPOSIT_VAULT_CONTRACT_NAME,
  mEDGE: M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME,
  mMEV: M_MEV_DEPOSIT_VAULT_CONTRACT_NAME,
  mRE7: M_RE7_DEPOSIT_VAULT_CONTRACT_NAME,
  mSL: M_SL_DEPOSIT_VAULT_CONTRACT_NAME,
  TACmBTC: TAC_M_BTC_DEPOSIT_VAULT_CONTRACT_NAME,
  TACmEDGE: TAC_M_EDGE_DEPOSIT_VAULT_CONTRACT_NAME,
  TACmMEV: TAC_M_MEV_DEPOSIT_VAULT_CONTRACT_NAME,
  hbUSDT: HB_USDT_DEPOSIT_VAULT_CONTRACT_NAME,
};

export type DeployDvConfig = {
  feeReceiver?: string;
  tokensReceiver?: string;
  instantDailyLimit: BigNumberish;
  instantFee: BigNumberish;
  sanctionsList?: string;
  variationTolerance: BigNumberish;
  minAmount: BigNumberish;
  minMTokenAmountForFirstDeposit: BigNumberish;
};

export const deployDepositVault = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
  networkConfig?: DeployDvConfig,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);
  const tokenAddresses = addresses?.[token];

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }

  if (!networkConfig) {
    throw new Error('Network config is not found');
  }

  console.log('Deploying DV...');

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

  const dvContractName = dvContractNamePerToken[token as MTokenName];

  if (!dvContractName) {
    throw new Error('DV contract name is not found');
  }

  const vaultFactory = await hre.ethers.getContractFactory(dvContractName);

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
    networkConfig.minMTokenAmountForFirstDeposit,
  ] as
    | Parameters<MBasisDepositVault['initialize']>
    | Parameters<MBtcDepositVault['initialize']>
    | Parameters<DepositVault['initialize']>;

  const deployment = await hre.upgrades.deployProxy(
    vaultFactory.connect(owner),
    params,
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log('Deployed DV:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, 'DV', deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
