import { ethers, network } from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import { MidasAccessControl, DataFeed } from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';

export const PYTH_CONFIGS = {
  hyperevm: {
    pythContract: '0xe9d69CdD6Fe41e7B621B4A688C5D1a68cB5c8ADc',
    usdhlUsdPriceId:
      '0x1497fb795ae65533d36d147b1b88c8b7226866a201589904c13acd314f694799',
    rpcUrl: rpcUrls.hyperevm,
  },
} as const;

export type PythNetwork = keyof typeof PYTH_CONFIGS;

export async function pythAdapterFixture(
  targetNetwork: PythNetwork = 'hyperevm',
) {
  const config = PYTH_CONFIGS[targetNetwork];

  // Fork the specified network
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: config.rpcUrl,
          // uses latest block for fresh Pyth data
        },
      },
    ],
  });
  await network.provider.send('evm_setAutomine', [true]);

  const [deployer, user] = await ethers.getSigners();
  const allRoles = getAllRoles();

  const midasAccessControl = await deployProxyContract<MidasAccessControl>(
    'MidasAccessControl',
    [],
  );

  // Grant default admin role to deployer
  await midasAccessControl.grantRole(
    allRoles.common.defaultAdmin,
    deployer.address,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {
    deployer,
    user,
    pythContract: config.pythContract,
    midasAccessControl,
    roles: allRoles,
  };

  if (targetNetwork === 'hyperevm') {
    const hyperConfig = config as typeof PYTH_CONFIGS.hyperevm;

    // Deploy USDHL/USD adapter
    const usdhlAdapterFactory = await ethers.getContractFactory(
      'PythChainlinkAdapter',
    );
    const usdhlAdapter = await usdhlAdapterFactory.deploy(
      hyperConfig.pythContract,
      hyperConfig.usdhlUsdPriceId,
    );
    await usdhlAdapter.deployed();

    // Deploy DataFeed
    const healthyDiff = 6 * 60 * 60; // 6 hours
    const minExpectedAnswer = ethers.utils.parseUnits('0.997', 8); // $0.997 in 8 decimals
    const maxExpectedAnswer = ethers.utils.parseUnits('1.003', 8); // $1.003 in 8 decimals

    const dataFeed = await deployProxyContract<DataFeed>('DataFeed', [
      midasAccessControl.address,
      usdhlAdapter.address,
      healthyDiff,
      minExpectedAnswer,
      maxExpectedAnswer,
    ]);

    Object.assign(result, {
      usdhlAdapter,
      usdhlUsdPriceId: hyperConfig.usdhlUsdPriceId,
      dataFeed,
      healthyDiff,
      minExpectedAnswer,
      maxExpectedAnswer,
    });
  }

  return result;
}

export type PythAdapterFixture = Awaited<ReturnType<typeof pythAdapterFixture>>;
