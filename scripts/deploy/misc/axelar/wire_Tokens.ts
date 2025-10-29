import {
  AxelarQueryAPI,
  CHAINS,
  Environment,
} from '@axelar-network/axelarjs-sdk';
import { constants, Contract, ethers } from 'ethers';
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
import {
  getMTokenOrThrow,
  getPaymentTokenOrThrow,
} from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  deployAndVerifyProxy,
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

  const hubAddresses = getCurrentAddresses(hre);
  const hubMTokenAddress = hubAddresses?.[mToken]?.token;

  const hubAxelarChainName = axelarChainNames[hubNetwork];

  if (!hubAxelarChainName) {
    throw new Error(`Chain ${hubNetwork} is not supported by axelar`);
  }

  if (!hubMTokenAddress) {
    throw new Error('Hub mToken address not found');
  }

  const deployemntConfigHub = getNetworkConfig(
    hre,
    mToken,
    'postDeploy',
  ).axelarIts;

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

  const salt = calculateSalt(mToken, hre.action);

  const linkedDeploySalt = await calculateDeploySalt(
    hre,
    walletForActionHub,
    salt,
  );

  const tokenId = await getTokenId(hre, linkedDeploySalt);

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
    // TODO: first do all the verification before sending any tx

    const axelarChainName = axelarChainNames[network];

    if (!axelarChainName) {
      throw new Error(`Chain ${network} is not supported by axelar`);
    }

    const networkHre = await getHreByNetworkName(network);
    const networkDeployer = await getDeployer(networkHre);
    const networkAddresses = getCurrentAddresses(networkHre);
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

    const itsNetwork = new Contract(
      axelarItsAddress,
      axelarItsAbi,
      networkDeployer,
    );

    const mTokenAddress = networkAddresses?.[mToken]?.token;

    if (!mTokenAddress) {
      throw new Error(`MToken address not found for network: ${network}`);
    }

    const managerDeployed =
      (await networkHre.ethers.provider.getCode(managerAddress)) !== '0x';

    if (!managerDeployed) {
      const shouldRegisterMedatada = true;

      if (shouldRegisterMedatada) {
        const estimatedValue = (await axelarSdk.estimateGasFee(
          axelarChainName,
          isHubTestnet ? CHAINS.TESTNET.AXELAR : CHAINS.MAINNET.AXELAR,
          defaultGas,
          'auto',
        )) as string;

        // TODO: check if already registered
        await sendAndWaitForCustomTxSign(
          hre,
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
            network,
          },
        );
      }

      if (network === hubNetwork) {
        await sendAndWaitForCustomTxSign(
          hre,
          await itsFactoryHub.registerCustomToken(
            salt,
            mTokenAddress,
            TOKEN_MANAGER_MINT_BURN,
            deployemntConfigHub.operator,
          ),
          {
            action: 'axelar-wire-tokens',
            comment: `register axelar custom token for ${mToken}`,
            network: hubNetwork,
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
          await itsFactoryHub.linkToken(
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
            network: hubNetwork,
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
