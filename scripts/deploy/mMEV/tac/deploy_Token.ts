import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  M_BTC_CONTRACT_NAME,
  TAC_M_MEV_CONTRACT_NAME,
} from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying TACmMEV...', { addresses });

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const deployment = await hre.upgrades.deployProxy(
    await hre.ethers.getContractFactory(TAC_M_MEV_CONTRACT_NAME, owner),
    [addresses.accessControl],
    {
      unsafeAllow: ['constructor'],
    },
  );

  console.log('Deployed TACmMEV:', deployment.address);

  if (deployment.deployTransaction) {
    console.log('Waiting 5 blocks...');
    await deployment.deployTransaction.wait(5);
    console.log('Waited.');
  }
  await logDeployProxy(hre, TAC_M_MEV_CONTRACT_NAME, deployment.address);
  await tryEtherscanVerifyImplementation(hre, deployment.address);
};

func(hre).then(console.log).catch(console.error);
