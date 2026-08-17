import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { buildHubRoutes, buildPeerEscrowUpdates } from './helpers';

import {
  ccipConfigPerMToken,
  ccipNetworkConfig,
  Network,
} from '../../../../config';
import { getCurrentAddresses } from '../../../../config/constants/addresses';
import { getHreByNetworkName } from '../../../../helpers/hardhat';
import { getMTokenOrThrow } from '../../../../helpers/utils';
import { DeployFunction } from '../../common/types';
import {
  getDeployer,
  getNetworkConfig,
  sendAndWaitForCustomTxSign,
} from '../../common/utils';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const mToken = getMTokenOrThrow(hre);
  const hub = hre.network.name as Network;
  const cctConfig = ccipConfigPerMToken[hub]?.[mToken];
  if (!cctConfig) throw new Error('CCT config not found');

  const routes = buildHubRoutes({
    hub,
    spokes: cctConfig.linkedNetworks,
    pathways: cctConfig.pathways,
  });
  const networks = [
    ...new Set(
      routes.flatMap(({ source, destination }) => [source, destination]),
    ),
  ];
  const chains: Record<
    string,
    { selector: string; escrow: string } | undefined
  > = {};

  for (const networkName of networks) {
    const network = networkName as Network;
    const networkHre = await getHreByNetworkName(network);
    const selector = ccipNetworkConfig[network]?.chainSelector;
    const escrow =
      getCurrentAddresses(networkHre)[mToken]?.ccip?.fallbackEscrow;
    if (!selector || !escrow) {
      throw new Error(`CCIP selector/escrow not found for ${network}`);
    }
    chains[network] = { selector: selector.toString(), escrow };
  }

  for (const update of buildPeerEscrowUpdates({ routes, chains })) {
    const network = update.network as Network;
    const networkHre = await getHreByNetworkName(network);
    const deployer = await getDeployer(networkHre);
    const escrowAddress =
      getCurrentAddresses(networkHre)[mToken]?.ccip?.fallbackEscrow;
    const escrowAdmin = getNetworkConfig(networkHre, mToken, 'postDeploy').ccip
      ?.escrowAdmin;
    if (!escrowAddress || !escrowAdmin) {
      throw new Error(`CCIP escrow/admin not found for ${network}`);
    }

    const escrow = await networkHre.ethers.getContractAt(
      'MidasCCTFallbackEscrow',
      escrowAddress,
      deployer,
    );
    if (
      await escrow.isPeerEscrow(update.sourceChainSelector, update.peerEscrow)
    ) {
      console.log(`CCIP peer escrow is already configured on ${network}`);
      continue;
    }

    await sendAndWaitForCustomTxSign(
      networkHre,
      await escrow.populateTransaction.setPeerEscrow(
        update.sourceChainSelector,
        update.peerEscrow,
        true,
      ),
      {
        action: 'update-ccip',
        mToken,
        comment: `configure ${mToken} return provenance on ${network}`,
      },
      escrowAdmin,
    );
  }
};

export default func;
