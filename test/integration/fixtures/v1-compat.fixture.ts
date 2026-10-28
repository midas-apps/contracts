import { mine, time } from '@nomicfoundation/hardhat-network-helpers';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers, upgrades } from 'hardhat';

import {
  MTokenName,
  Network,
  PaymentTokenName,
  rpcUrls,
} from '../../../config';
import {
  midasAddressesPerNetwork,
  VaultType,
} from '../../../config/constants/addresses';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import {
  getAllRoles,
  getRolesForToken,
  tokenLevelGreenlistTokens,
} from '../../../helpers/roles';
import {
  CustomAggregatorV3CompatibleFeed__factory,
  CustomAggregatorV3CompatibleFeedGrowth__factory,
  DataFeed__factory,
  IERC20Metadata,
  MidasAccessControl,
  MidasAccessControl__factory,
  MidasAccessControlTimelockController,
  MidasPauseManager,
  MidasTimelockManager,
  MToken,
  MToken__factory,
} from '../../../typechain-types';
import { NO_DELAY } from '../../common/ac.helpers';
import { deployProxyContract } from '../../common/deploy.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import {
  getV1Vault,
  grantRole,
  normalizeAddress,
  prepareV1Vault,
  upgradeProxy,
  V1VaultsContext,
} from '../helpers/v1-vaults.helpers';

export type V1CompatTokenConfig = {
  mToken: MTokenName;
  network: Network;
  // block where the token, its vaults and the holder balance exist
  forkBlock: number;
  // real holder impersonated for every vault interaction
  holder: string;
  // used for deposits and as redemption tokenOut
  paymentToken: PaymentTokenName;
  // payment token amount per deposit
  depositAmount: string;
  // mToken amount per redemption
  redeemAmount: string;
  // keys of the V1 vaults in `config/constants/addresses.ts`
  vaults: VaultType[];
};

// holder of DEFAULT_ADMIN_ROLE on the AccessControl
const AC_DEFAULT_ADMIN = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';

export const v1CompatTokens: V1CompatTokenConfig[] = [
  // regular token
  {
    mToken: 'mTBILL',
    network: 'main',
    forkBlock: 26285043,
    holder: '0x359450fb74defE32C9276bBE7B378F18D4b4DaD2',
    paymentToken: 'usdc',
    depositAmount: '10000',
    redeemAmount: '1000',
    vaults: ['depositVault', 'redemptionVault', 'redemptionVaultUstb'],
  },
  // permissioned token, separate DV/RV growth feeds
  {
    mToken: 'mGLOBAL',
    network: 'main',
    forkBlock: 26285043,
    holder: '0xe74e85b86Bb4B03c33A564B2e9995e2B42441fa5',
    paymentToken: 'usdc',
    depositAmount: '10000',
    redeemAmount: '1000',
    // redemptionVaultAave has no burner role on mainnet, so it is not operational
    vaults: ['depositVaultAave', 'redemptionVaultSwapper'],
  },
  // permissioned token with min holding balance, ~130k USD per mWIN
  {
    mToken: 'mWIN',
    network: 'main',
    forkBlock: 26285043,
    holder: '0x0B776F61BbAb470e10F6C890b7dBc420a3D73DE0',
    paymentToken: 'usdc',
    depositAmount: '300000',
    // redemptionVaultMToken is not min balance exempt, so V1 requests below 1 mWIN revert
    redeemAmount: '1',
    vaults: ['depositVault', 'redemptionVaultSwapper', 'redemptionVaultMToken'],
  },
  // Rootstock pilot
  {
    mToken: 'mTBILL',
    network: 'rootstock',
    forkBlock: 9361280,
    holder: '0xf651032419e3a19A3f8B1A350427b94356C86bf4',
    paymentToken: 'usdc',
    depositAmount: '100',
    redeemAmount: '10',
    vaults: ['depositVault', 'redemptionVault'],
  },
  {
    mToken: 'mBTC',
    network: 'rootstock',
    forkBlock: 9361280,
    holder: '0xaf80C503493bdA9172Bd1FbeCf7A063f9DfDf44A',
    paymentToken: 'wrbtc',
    depositAmount: '0',
    redeemAmount: '0.0003',
    // depositVault is paused and has no minter role on Rootstock
    vaults: ['redemptionVault'],
  },
];

export async function v1CompatFixture(config: V1CompatTokenConfig) {
  await resetFork(rpcUrls[config.network], config.forkBlock);
  // pin time to the fork block so feeds are not stale, and mine a block:
  // calls on the forked block itself fail on networks like Rootstock
  await time.setNextBlockTimestamp(
    (await ethers.provider.getBlock(config.forkBlock)).timestamp + 12,
  );
  await mine();

  const addresses = midasAddressesPerNetwork[config.network]!;
  const tokenAddresses = addresses[config.mToken]!;
  const [operator, stranger, clawbackReceiver, ...signers] =
    await ethers.getSigners();

  const accessControl = (await ethers.getContractAt(
    'MidasAccessControl',
    normalizeAddress(addresses.accessControl!),
  )) as MidasAccessControl;

  const proxyAdmin = await ethers.getContractAt(
    'ProxyAdmin',
    await upgrades.erc1967.getAdminAddress(accessControl.address),
  );
  const proxyAdminOwner = await impersonateAndFundAccount(
    await proxyAdmin.owner(),
  );
  const acDefaultAdmin = await impersonateAndFundAccount(AC_DEFAULT_ADMIN);

  const mToken = (await ethers.getContractAt(
    'mToken',
    normalizeAddress(tokenAddresses.token!),
  )) as MToken;
  const paymentToken = (await ethers.getContractAt(
    'IERC20Metadata',
    normalizeAddress(addresses.paymentTokens![config.paymentToken]!.token!),
  )) as IERC20Metadata;
  const holder = await impersonateAndFundAccount(
    normalizeAddress(config.holder),
  );

  const vaults = config.vaults.map((name) =>
    getV1Vault(name, tokenAddresses[name]!),
  );

  const ctx: V1VaultsContext = {
    mTokenName: config.mToken,
    mToken,
    accessControl,
    acDefaultAdmin,
    stranger,
    paymentToken,
    holder,
    operator,
    depositAmount: parseUnits(config.depositAmount),
    redeemAmount: parseUnits(config.redeemAmount),
    vaults,
  };

  // operator administers the V1 vaults during the test
  for (const vault of vaults) {
    await grantRole(ctx, await vault.contract.vaultRole(), operator.address);
    await prepareV1Vault(ctx, vault, (address) =>
      impersonateAndFundAccount(normalizeAddress(address)),
    );
  }

  return {
    ...ctx,
    config,
    proxyAdminOwner,
    clawbackReceiver,
    securityCouncil: signers.slice(0, 5),
    pauseManager: undefined as MidasPauseManager | undefined,
  };
}

export type V1CompatFixture = Awaited<ReturnType<typeof v1CompatFixture>>;

/**
 * Step 1: upgrade AccessControl, deploy and wire PauseManager,
 * TimelockManager and the timelock
 */
export async function upgradeAccessControl(fixture: V1CompatFixture) {
  const { accessControl, acDefaultAdmin, operator } = fixture;

  await upgradeProxy(
    fixture.proxyAdminOwner,
    accessControl.address,
    MidasAccessControl__factory,
    [],
    {
      fn: 'initializeV2',
      args: [
        0,
        [
          ...new Set(
            tokenLevelGreenlistTokens.map(
              (t) => getRolesForToken(t).greenlisted,
            ),
          ),
        ],
      ],
    },
  );

  const pauseManager = await deployProxyContract<MidasPauseManager>(
    'MidasPauseManager',
    [accessControl.address, NO_DELAY, NO_DELAY],
  );
  const timelockManager = await deployProxyContract<MidasTimelockManager>(
    'MidasTimelockManager',
    [accessControl.address, 100, fixture.securityCouncil.map((s) => s.address)],
  );
  const timelock =
    await deployProxyContract<MidasAccessControlTimelockController>(
      'MidasAccessControlTimelockController',
      [timelockManager.address],
    );

  await accessControl
    .connect(acDefaultAdmin)
    .initializeRelationships(timelockManager.address, pauseManager.address);
  await timelockManager
    .connect(acDefaultAdmin)
    .initializeTimelock(timelock.address);

  await grantRole(fixture, getAllRoles().common.pauseAdmin, operator.address);

  fixture.pauseManager = pauseManager;
}

/**
 * Step 2: upgrade the mToken data feeds and the payment token data feed
 */
export async function upgradeDataFeeds(fixture: V1CompatFixture) {
  const { config } = fixture;
  const addresses = midasAddressesPerNetwork[config.network]!;
  const tokenAddresses = addresses[config.mToken]!;
  const roles = getAllRoles();

  const feeds = [
    ...(['dataFeed', 'dataFeedDv', 'dataFeedRv'] as const).map((key) => ({
      address: tokenAddresses[key],
      role: getRolesForToken(config.mToken).customFeedAdmin,
    })),
    {
      address: addresses.paymentTokens![config.paymentToken]!.dataFeed,
      role: roles.common.defaultAdmin,
    },
  ];

  for (const feed of feeds.filter((f) => f.address)) {
    await upgradeProxy(
      fixture.proxyAdminOwner,
      normalizeAddress(feed.address!),
      DataFeed__factory,
      [feed.role],
      { fn: 'initializeV2', args: [constants.AddressZero] },
    );
  }
}

/**
 * Step 3: upgrade the custom aggregators
 */
export async function upgradeCustomAggregators(fixture: V1CompatFixture) {
  const { config } = fixture;
  const tokenAddresses =
    midasAddressesPerNetwork[config.network]![config.mToken]!;
  const role = getRolesForToken(config.mToken).customFeedAdmin;

  if (tokenAddresses.customFeed) {
    await upgradeProxy(
      fixture.proxyAdminOwner,
      normalizeAddress(tokenAddresses.customFeed),
      CustomAggregatorV3CompatibleFeed__factory,
      [role],
    );
  }

  if (tokenAddresses.customFeedGrowth) {
    await upgradeProxy(
      fixture.proxyAdminOwner,
      normalizeAddress(tokenAddresses.customFeedGrowth),
      CustomAggregatorV3CompatibleFeedGrowth__factory,
      [role],
    );
  }
}

/**
 * Step 4: grant the roles the V2 token expects from the V1 vaults and
 * upgrade the mToken
 */
export async function upgradeMToken(fixture: V1CompatFixture) {
  const { config, operator, vaults } = fixture;
  const roles = getRolesForToken(config.mToken);
  const metadata = mTokensMetadata[config.mToken];

  const grant = (role: string, account: string) =>
    grantRole(fixture, role, account);

  for (const vault of vaults) {
    if (vault.isDeposit) {
      await grant(roles.minter, vault.contract.address);
      continue;
    }

    await grant(roles.burner, vault.contract.address);

    // addresses holding or receiving mTokens in V1 redemption flows
    const holders = [
      vault.contract.address,
      await vault.contract.feeReceiver(),
      await vault.contract
        .liquidityProvider()
        .catch(() => constants.AddressZero),
    ].filter((a) => a !== constants.AddressZero);

    for (const account of holders) {
      if (metadata.isPermissioned) await grant(roles.greenlisted, account);
      if (metadata.isMinBalance) await grant(roles.minBalanceExempt, account);
    }
  }

  // operator manages the token during the post-migration checks
  await grant(roles.tokenManager, operator.address);

  await upgradeProxy(
    fixture.proxyAdminOwner,
    fixture.mToken.address,
    MToken__factory,
    [
      roles.tokenManager,
      roles.minter,
      roles.burner,
      roles.greenlisted,
      roles.minBalanceExempt,
    ],
    {
      fn: 'initializeV3',
      args: [
        fixture.clawbackReceiver.address,
        constants.MaxUint256,
        !!metadata.isPermissioned,
        !!metadata.isMinBalance,
      ],
    },
  );
}
