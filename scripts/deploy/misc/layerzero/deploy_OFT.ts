import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { rpcUrls } from '../../../../config';
import {
  getCurrentAddresses,
  midasAddressesPerNetwork,
} from '../../../../config/constants/addresses';
import {
  etherscanVerify,
  getOriginalNetworkOrThrow,
  getPaymentTokenOrThrow,
  logDeploy,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import { getDeployer } from '../../common/utils';
import { paymentTokenDeploymentConfigs } from '../../configs/payment-tokens';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployer = await getDeployer(hre);
  const paymentToken = getPaymentTokenOrThrow(hre);
  const originalNetwork = getOriginalNetworkOrThrow(hre);

  const config =
    paymentTokenDeploymentConfigs.networkConfigs[hre.network.config.chainId!]?.[
      paymentToken
    ];

  if (!config?.layerZero?.delegate) {
    throw new Error('Delegate not found');
  }

  const addressesOriginalNetwork = midasAddressesPerNetwork[originalNetwork];

  const tokenAddressesOriginalNetwork =
    addressesOriginalNetwork?.paymentTokens?.[paymentToken];

  if (!tokenAddressesOriginalNetwork || !tokenAddressesOriginalNetwork.token) {
    throw new Error('Token addresses not found or missing required fields');
  }

  const providerOriginalNetwork = new hre.ethers.providers.JsonRpcProvider(
    rpcUrls[originalNetwork],
  );

  const tokenContract = (
    await hre.ethers.getContractAt(
      'IERC20Metadata',
      tokenAddressesOriginalNetwork.token,
    )
  ).connect(providerOriginalNetwork);

  const name = await tokenContract.name();
  const symbol = await tokenContract.symbol();

  const factory = await hre.ethers.getContractFactory('MidasLzOFT', deployer);

  const endpointV2Deployment = await hre.deployments.get('EndpointV2');

  const args = [
    name + ' OFT',
    symbol,
    config.layerZero.sharedDecimals,
    endpointV2Deployment.address,
    config.layerZero.delegate,
  ] as const;

  const contract = await factory.deploy(...args);

  logDeploy('MidasLzOFT', undefined, contract.address);

  console.log('Waiting for deployment to be confirmed...');
  await contract.deployTransaction.wait(3);
  console.log('Verifying contract...');
  await etherscanVerify(hre, contract.address, ...args);
};

export default func;
