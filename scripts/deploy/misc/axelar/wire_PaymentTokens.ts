import { AxelarQueryAPI, Environment } from '@axelar-network/axelarjs-sdk';
import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  axelarChainNames,
  chainIds,
  isTestnetNetwork,
  itsConfigPerPToken,
  Network,
} from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import {
  axelarItsAbi,
  axelarItsAddress,
  axelarItsFactoryAbi,
  axelarItsFactoryAddress,
} from '../../../../helpers/axelar';
import {
  calculateCanonicalDeploySalt,
  getTokenId,
} from '../../../../helpers/axelar/utils';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import { getPaymentTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getWalletAddressForAction,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';
import { paymentTokenDeploymentConfigs } from '../../configs/payment-tokens';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployerHub = await getDeployer(hre);

  const pToken = getPaymentTokenOrThrow(hre);
  const hubNetwork = hre.network.name as Network;
  const config = itsConfigPerPToken[hubNetwork]?.[pToken];

  const hubAddresses = getCurrentAddresses(hre);
  const hubPTokenAddress = hubAddresses?.paymentTokens?.[pToken]?.token;

  const hubAxelarChainName = axelarChainNames[hubNetwork];

  if (!hubAxelarChainName) {
    throw new Error(`Chain ${hubNetwork} is not supported by axelar`);
  }

  if (!hubPTokenAddress) {
    throw new Error('Hub pToken address not found');
  }

  const deployemntConfigHub =
    paymentTokenDeploymentConfigs.networkConfigs[chainIds[hubNetwork]]?.[pToken]
      ?.postDeploy?.axelar;

  if (!deployemntConfigHub) {
    throw new Error('Hub ITS config not found');
  }

  if (!config) {
    throw new Error(
      'Config not found or --network is incorrect (should be hub)',
    );
  }

  const linkedNetworks = config.linkedNetworks;

  if (linkedNetworks.length === 0) {
    throw new Error('No linked networks found');
  }

  const walletForActionHub = await getWalletAddressForAction(
    hre,
    'axelar-wire-tokens',
  );

  const itsHub = new Contract(
    // same address for all networks
    axelarItsAddress,
    axelarItsAbi,
    deployerHub,
  );

  const itsFactoryHub = new Contract(
    // same address for all networks
    axelarItsFactoryAddress,
    axelarItsFactoryAbi,
    deployerHub,
  );

  const defaultGas = 500_000;

  const deploySalt = await calculateCanonicalDeploySalt(hre, hubPTokenAddress);

  const tokenId = await getTokenId(hre, deploySalt);

  const managerAddress = await itsHub.tokenManagerAddress(tokenId);

  console.log('Manager address for all networks: ', managerAddress);
  console.log('Token id for all networks: ', tokenId);

  const isHubTestnet = isTestnetNetwork(hubNetwork);

  const axelarSdk = new AxelarQueryAPI({
    environment: isHubTestnet ? Environment.TESTNET : Environment.MAINNET,
  });

  for (const network of [hubNetwork, ...linkedNetworks]) {
    if (isTestnetNetwork(network) !== isHubTestnet) {
      throw new Error(
        'All networks should be in the same category (testnet or mainnet)',
      );
    }

    const axelarChainName = axelarChainNames[network];

    if (!axelarChainName) {
      throw new Error(`Chain ${network} is not supported by axelar`);
    }

    const networkHre = await getHreByNetworkName(network);

    const walletForActionNetwork = await getWalletAddressForAction(
      networkHre,
      'axelar-wire-tokens',
    );

    if (
      walletForActionHub.toLowerCase() !== walletForActionNetwork.toLowerCase()
    ) {
      throw new Error(
        'Deployer wallets should be the same accross all networks',
      );
    }

    const managerDeployed =
      (await networkHre.ethers.provider.getCode(managerAddress)) !== '0x';

    if (!managerDeployed) {
      if (network === hubNetwork) {
        await sendAndWaitForCustomTxSign(
          networkHre,
          await itsFactoryHub['registerCanonicalInterchainToken(address)'](
            hubPTokenAddress,
          ),
          {
            action: 'axelar-wire-tokens',
            comment: `register canonical interchain token for ${pToken}`,
          },
        );
      } else {
        const estimatedValue = (await axelarSdk.estimateGasFee(
          hubAxelarChainName,
          axelarChainName,
          defaultGas,
          'auto',
        )) as string;

        await sendAndWaitForCustomTxSign(
          hre,
          await itsFactoryHub[
            'deployRemoteCanonicalInterchainToken(address,string,uint256)'
          ](hubPTokenAddress, axelarChainName, estimatedValue, {
            value: estimatedValue,
          }),
          {
            action: 'axelar-wire-tokens',
            comment: `deploy remote canonical interchain token for ${pToken} on axelar for ${network}`,
          },
        );
      }
    } else {
      if (network === hubNetwork) {
        console.log(`Already registered custom token on ${network}`);
      } else {
        console.log(
          `Already linked custom token for ${network} on ${hubNetwork}`,
        );
      }
    }
  }
};

export default func;
