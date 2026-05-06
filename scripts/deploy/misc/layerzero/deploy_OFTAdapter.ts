import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getPaymentTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';
import { paymentTokenDeploymentConfigs } from '../../configs/payment-tokens';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const paymentToken = getPaymentTokenOrThrow(hre);

  const addresses = getCurrentAddresses(hre);

  const config =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      paymentToken
    ];

  if (!config?.postDeploy?.layerZero?.delegate) {
    throw new Error('Delegate not found');
  }

  const tokenAddresses = addresses?.paymentTokens?.[paymentToken];

  if (!tokenAddresses || !tokenAddresses.token) {
    throw new Error('Token addresses not found or missing required fields');
  }

  const factory = await hre.ethers.getContractFactory(
    'MidasLzOFTAdapter',
    deployer,
  );

  const endpointV2Deployment = await hre.deployments.get('EndpointV2');

  const args = [
    tokenAddresses.token,
    config.postDeploy?.layerZero?.sharedDecimals,
    endpointV2Deployment.address,
    config.postDeploy?.layerZero?.delegate,
  ] as const;

  const contract = await factory.deploy(...args);

  logDeploy('MidasLzOFTAdapter', undefined, contract.address);

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, contract.address, ...args);
};

export default func;
