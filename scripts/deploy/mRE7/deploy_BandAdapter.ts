import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_EDGE_CONTRACT_NAME } from '../../../config';
import { getCurrentAddresses } from '../../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying mEDGE...', { addresses });

  // TODO: implement
  // if (!addresses?.accessControl)
  //   throw new Error('Access control address is not set');

  // const fac = await hre.ethers.getContractFactory(
  //   'StorkChainlinkAdapter',
  //   owner,
  // );

  // const tx = await fac.deploy(
  //   '0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62',
  //   '0xe78fbac639b951bb7d4d8a6a7e4e3be7be423f4056b225ec071544c48dc303ef',
  // );

  // console.log('Deployed mEDGE:', tx.address);
};

func(hre).then(console.log).catch(console.error);
