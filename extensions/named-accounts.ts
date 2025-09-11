import { extendEnvironment } from 'hardhat/config';

declare module 'hardhat/types/config' {
  interface HardhatUserConfig {
    namedAccounts?: {
      [name: string]:
        | string
        | number
        | { [network: string]: null | number | string };
    };
  }
}

extendEnvironment((hre) => {
  hre.getNamedAccounts = async () => {
    const signers = await hre.ethers.getSigners();

    const chainId = hre.network.config.chainId;
    const networkName = hre.network.name;

    const namedAccounts = hre.userConfig.namedAccounts;
    if (!namedAccounts) {
      return {};
    }

    const namedAccountsEntries = Object.entries(namedAccounts);

    return namedAccountsEntries.reduce<Record<string, string>>(
      (acc, [name, address]) => {
        const value =
          typeof address === 'object'
            ? address[networkName ?? chainId] ?? ''
            : address;

        if (typeof value === 'number') {
          acc[name] = signers[value].address;
        } else {
          acc[name] = value;
        }

        return acc;
      },
      {},
    );
  };
});
