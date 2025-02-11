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

  console.log('Deploying BandStdChailinkAdapter...', { addresses });

  // TODO: implement
  // if (!addresses?.accessControl)
  //   throw new Error('Access control address is not set');

  const fac = await hre.ethers.getContractFactory(
    'BandStdChailinkAdapter',
    owner,
  );

  const tx = await fac.deploy(
    '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
    'USDC',
    'USD',
  );

  console.log('Deployed BandStdChailinkAdapter:', tx.address);
};

func(hre).then(console.log).catch(console.error);
