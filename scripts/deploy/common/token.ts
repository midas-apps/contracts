import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  HB_USDT_CONTRACT_NAME,
  M_BASIS_CONTRACT_NAME,
  M_BTC_CONTRACT_NAME,
  M_EDGE_CONTRACT_NAME,
  M_MEV_CONTRACT_NAME,
  M_RE7_CONTRACT_NAME,
  M_SL_CONTRACT_NAME,
  M_TBILL_CONTRACT_NAME,
  MTokenName,
  TAC_M_BTC_CONTRACT_NAME,
  TAC_M_EDGE_CONTRACT_NAME,
  TAC_M_MEV_CONTRACT_NAME,
} from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

const tokenContractNamePerToken: Record<MTokenName, string> = {
  mTBILL: M_TBILL_CONTRACT_NAME,
  mBASIS: M_BASIS_CONTRACT_NAME,
  mBTC: M_BTC_CONTRACT_NAME,
  mEDGE: M_EDGE_CONTRACT_NAME,
  mRE7: M_RE7_CONTRACT_NAME,
  mMEV: M_MEV_CONTRACT_NAME,
  mSL: M_SL_CONTRACT_NAME,
  hbUSDT: HB_USDT_CONTRACT_NAME,
  TACmBTC: TAC_M_BTC_CONTRACT_NAME,
  TACmEDGE: TAC_M_EDGE_CONTRACT_NAME,
  TACmMEV: TAC_M_MEV_CONTRACT_NAME,
};

export const deployMToken = async (
  hre: HardhatRuntimeEnvironment,
  token: MTokenName,
) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const tokenContractName = tokenContractNamePerToken[token];

  if (!tokenContractName) {
    throw new Error('Token contract name is not set');
  }

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(tokenContractName, owner),
    [addresses.accessControl],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`Deployed ${token}:`, deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, tokenContractName, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};
