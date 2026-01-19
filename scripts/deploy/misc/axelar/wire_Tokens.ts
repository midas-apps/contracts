import {
  AxelarQueryAPI,
  CHAINS,
  Environment,
} from '@axelar-network/axelarjs-sdk';
import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import {
  axelarChainNames,
  isTestnetNetwork,
  itsConfigPerMToken,
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
  calculateDeploySalt,
  calculateSalt,
  getTokenId,
} from '../../../../helpers/axelar/utils';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import { getMTokenOrThrow, logDeploy } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  getWalletAddressForAction,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

const TOKEN_MANAGER_MINT_BURN = 4;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const deployerHub = await getDeployer(hre);

  const mToken = getMTokenOrThrow(hre);
  const hubNetwork = hre.network.name as Network;
  const config = itsConfigPerMToken[hubNetwork]?.[mToken];

  const hubAxelarChainName = axelarChainNames[hubNetwork];

  if (!hubAxelarChainName) {
    throw new Error(`Chain ${hubNetwork} is not supported by axelar`);
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

  const defaultGas = 300_000;

  const salt = calculateSalt(mToken, hre.action);

  const linkedDeploySalt = await calculateDeploySalt(
    hre,
    walletForActionHub,
    salt,
  );

  const tokenId = await getTokenId(hre, linkedDeploySalt);

  const managerAddress = await itsHub.tokenManagerAddress(tokenId);

  logDeploy('Manager address for all networks: ', undefined, managerAddress);
  logDeploy('Token id for all networks: ', undefined, tokenId);
  logDeploy('Salt for all networks: ', undefined, salt);

  const isHubTestnet = isTestnetNetwork(hubNetwork);

  const axelarSdk = new AxelarQueryAPI({
    environment: isHubTestnet ? Environment.TESTNET : Environment.MAINNET,
  });

  const getAllNetworkConfigs = async (network: Network) => {
    const networkHre = await getHreByNetworkName(network);

    if (isTestnetNetwork(network) !== isHubTestnet) {
      throw new Error(
        'All networks should be in the same category (testnet or mainnet)',
      );
    }

    const axelarChainName = axelarChainNames[network];

    if (!axelarChainName) {
      throw new Error(`Chain ${network} is not supported by axelar`);
    }

    const deployemntConfig = getNetworkConfig(
      networkHre,
      mToken,
      'postDeploy',
    ).axelarIts;

    if (!deployemntConfig) {
      throw new Error('ITS config not found');
    }

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

    const networkAddresses = getCurrentAddresses(networkHre);

    const mTokenAddress = networkAddresses?.[mToken]?.token;

    if (!mTokenAddress) {
      throw new Error(`MToken address not found for network: ${network}`);
    }

    const networkDeployer = await getDeployer(networkHre);

    return {
      networkHre,
      deployemntConfig,
      walletForActionNetwork,
      mTokenAddress,
      networkAddresses,
      axelarChainName,
      networkDeployer,
    };
  };

  const networks = [hubNetwork, ...linkedNetworks];

  // verification step
  for (const network of networks) {
    await getAllNetworkConfigs(network);
  }

  console.log('verification passed for all networks', networks);

  for (const network of networks) {
    const {
      networkHre,
      deployemntConfig,
      mTokenAddress,
      axelarChainName,
      networkDeployer,
    } = await getAllNetworkConfigs(network);

    const itsNetwork = new Contract(
      axelarItsAddress,
      axelarItsAbi,
      networkDeployer,
    );

    const managerDeployed =
      (await networkHre.ethers.provider.getCode(managerAddress)) !== '0x';

    if (!managerDeployed) {
      const estimatedValue = (await axelarSdk.estimateGasFee(
        axelarChainName,
        isHubTestnet ? CHAINS.TESTNET.AXELAR : CHAINS.MAINNET.AXELAR,
        defaultGas,
        'auto',
      )) as string;

      await sendAndWaitForCustomTxSign(
        networkHre,
        await itsNetwork.populateTransaction.registerTokenMetadata(
          mTokenAddress,
          estimatedValue,
          {
            value: estimatedValue,
          },
        ),
        {
          action: 'axelar-wire-tokens',
          comment: `register axelar metadata for ${mToken}`,
        },
      );

      if (network === hubNetwork) {
        await sendAndWaitForCustomTxSign(
          networkHre,
          await itsFactoryHub.populateTransaction.registerCustomToken(
            salt,
            mTokenAddress,
            TOKEN_MANAGER_MINT_BURN,
            deployemntConfig.operator,
          ),
          {
            action: 'axelar-wire-tokens',
            comment: `register axelar custom token for ${mToken}`,
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
          await itsFactoryHub.populateTransaction.linkToken(
            salt,
            axelarChainName,
            mTokenAddress,
            TOKEN_MANAGER_MINT_BURN,
            deployemntConfig.operator,
            estimatedValue,
            {
              value: estimatedValue,
            },
          ),
          {
            action: 'axelar-wire-tokens',
            comment: `link ${mToken} on axelar with ${network}`,
          },
        );
      }
    } else {
      console.log(`Already registered metadata on ${network}`);
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
