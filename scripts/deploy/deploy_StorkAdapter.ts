import * as hre from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { M_EDGE_CONTRACT_NAME } from '../../config';
import { getCurrentAddresses } from '../../config/constants/addresses';
import {
  logDeployProxy,
  tryEtherscanVerifyImplementation,
} from '../../helpers/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const addresses = getCurrentAddresses(hre);
  const { deployer } = await hre.getNamedAccounts();
  const owner = await hre.ethers.getSigner(deployer);

  console.log('Deploying stork adapter...', { addresses });

  if (!addresses?.accessControl)
    throw new Error('Access control address is not set');

  const fac = await hre.ethers.getContractFactory(
    'StorkChainlinkAdapter',
    owner,
  );

  const tx = await fac.deploy(
    // replace with the actual address
    '0xacC0a0cF13571d30B4b8637996F5D6D774d4fd62',
    // replace with the actual id
    '0x6dcd0a8fb0460d4f0f98c524e06c10c63377cd098b589c0b90314bfb55751558',
  );

  console.log('Deployed stork adapter:', tx.address);
};

func(hre).then(console.log).catch(console.error);
