import {
  configsPerNetwork,
  getAdapterNetworkFixture,
} from './fixtures/adapters.fixture';
import {
  erc4626AdaptersSuits,
  pythAdaptersSuits,
  singleAddressAdaptersSuits,
  storkAdaptersSuits,
  syrupAdaptersSuits,
} from './suits/adapters.suits';

import { Network } from '../../config';

for (const networkKey in configsPerNetwork) {
  const network = networkKey as Network;
  const config = configsPerNetwork[network as Network]!;

  describe(`Chainlink Adapters on ${network}`, function () {
    // Each adapter's first fixture load resets the mainnet fork, which can take
    // ~2min over RPC on its own; give the suite headroom so slow forks (e.g. the
    // Syrup adapters) don't flake on the timeout.
    this.timeout(300000);

    if (config.syrupAdapters?.length) {
      syrupAdaptersSuits(
        network,
        config.syrupAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }

    // band on oasis is unavailable for some reason
    // if (config.bandAdapters?.length) {
    //   bandAdaptersSuits(
    //     network,
    //     config.bandAdapters.map((adapter) => getBandAdapterId(adapter)),
    //     getAdapterNetworkFixture(network),
    //   );
    // }

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

    if (config.singleAddressAdapters?.length) {
      singleAddressAdaptersSuits(
        network,
        config.singleAddressAdapters.map((adapter) => adapter.name),
        getAdapterNetworkFixture(network),
      );
    }
  });
}
