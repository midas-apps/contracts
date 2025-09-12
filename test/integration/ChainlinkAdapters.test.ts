import hre from 'hardhat';

import {
  configsPerNetwork,
  getAdapterNetworkFixture,
} from './fixtures/adapters.fixture';
import { getBandAdapterId } from './helpers/adapters-helpers';
import {
  bandAdaptersSuits,
  beHypeAdaptersSuits,
  erc4626AdaptersSuits,
  mantleLspStakingAdaptersSuits,
  pythAdaptersSuits,
  rsEthAdaptersSuits,
  storkAdaptersSuits,
  syrupAdaptersSuits,
  wrappedEEthAdaptersSuits,
} from './suits/adapters.suits';

import { Network } from '../../config';
import { forkNetwork } from '../../helpers/utils';

for (const networkKey in configsPerNetwork) {
  const network = networkKey as Network;
  const config = configsPerNetwork[network as Network]!;

  describe(`Chainlink Adapters on ${network}`, function () {
    this.timeout(120000);

    it('reset network', async function () {
      await forkNetwork(hre, 'main');
    });

    if (config.syrupAdapters?.length) {
      syrupAdaptersSuits(
        network,
        config.syrupAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.bandAdapters?.length) {
      bandAdaptersSuits(
        network,
        config.bandAdapters.map((adapter) => getBandAdapterId(adapter)),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.beHypeAdapters?.length) {
      beHypeAdaptersSuits(
        network,
        config.beHypeAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.mantleLspStakingAdapters?.length) {
      mantleLspStakingAdaptersSuits(
        network,
        config.mantleLspStakingAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.rsEthAdapters?.length) {
      rsEthAdaptersSuits(
        network,
        config.rsEthAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.wrappedEEthAdapters?.length) {
      wrappedEEthAdaptersSuits(
        network,
        config.wrappedEEthAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.storkAdapters?.length) {
      storkAdaptersSuits(
        network,
        config.storkAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.pythAdapters?.length) {
      pythAdaptersSuits(
        network,
        config.pythAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    if (config.erc4626Adapters?.length) {
      erc4626AdaptersSuits(
        network,
        config.erc4626Adapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }
  });
}
