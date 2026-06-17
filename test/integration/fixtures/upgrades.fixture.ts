import { mine, setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { ContractFactory } from 'ethers';
import { parseUnits } from 'ethers/lib.esm/utils';
import { ethers } from 'hardhat';
import hre from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControl,
  MidasAccessControlTimelockController,
  MidasPauseManager,
  MidasTimelockManager,
  MidasAccessControl__factory,
  DataFeed__factory,
  CustomAggregatorV3CompatibleFeedGrowth__factory,
  MToken,
  DataFeed,
  CustomAggregatorV3CompatibleFeed,
  CustomAggregatorV3CompatibleFeed__factory,
  MToken__factory,
  CustomAggregatorV3CompatibleFeedGrowth,
  MTokenPermissioned,
  MTokenPermissioned__factory,
} from '../../../typechain-types';
import { NO_DELAY, NULL_DELAY } from '../../common/ac.helpers';
import { asyncForEach, Constructor } from '../../common/common.helpers';
import { deployProxyContract } from '../../common/deploy.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';

export async function mainnetUpgradeFixture() {
  const acDefaultAdminAddress = '0xd4195CF4df289a4748C1A7B6dDBE770e27bA1227';

  const acAddress = '0x0312A9D1Ff2372DDEdCBB21e4B6389aFc919aC4B';
  const proxyAdminAddress = '0xbf25b58cB8DfaD688F7BcB2b87D71C23A6600AaC';

  // mGLOBAL addresses
  const mGlobalAddress = '0x7433806912Eae67919e66aea853d46Fa0aef98A8';
  const mGlobalCustomFeedGrowthAddress =
    '0x66Aa9fcD63DF74e1f67A9452E6E59Fbc67f75E38';
  const mGlobalDataFeedAddress = '0x58476f452df10E6Bf17dc1fee418E98dE9e14868';

  // mTBILL addresses
  const mTbillDataFeedAddress = '0xfCEE9754E8C375e145303b7cE7BEca3201734A2B';
  const mTbillCustomFeedAddress = '0x056339C044055819E8Db84E71f5f2E1F536b2E5b';
  const mTbillAddress = '0xDD629E5241CbC5919847783e6C96B2De4754e438';

  // mBTC addresses
  const mBtcDataFeedAddress = '0x9987BE0c1dc5Cd284a4D766f4B5feB4F3cb3E28e';
  const mBtcCustomFeedAddress = '0xA537EF0343e83761ED42B8E017a1e495c9a189Ee';
  const mBtcAddress = '0x007115416AB6c266329a03B09a8aa39aC2eF7d9d';

  // mROX addresses
  const mRoxAddress = '0x67E1F506B148d0Fc95a4E3fFb49068ceB6855c05';

  const [clawbackReceiver, ...signers] = await ethers.getSigners();

  await resetFork(rpcUrls.main, 25193577);

  await mine();

  const proxyAdmin = await ethers.getContractAt(
    'ProxyAdmin',
    proxyAdminAddress,
  );
  const proxyAdminOwnerAddress = await proxyAdmin.owner();

  const proxyAdminOwner = await impersonateAndFundAccount(
    proxyAdminOwnerAddress,
  );

  const acDefaultAdmin = await impersonateAndFundAccount(acDefaultAdminAddress);

  await setBalance(proxyAdminOwner.address, parseUnits('1000', 18));
  await setBalance(acDefaultAdmin.address, parseUnits('1000', 18));

  const accessControl = (await ethers.getContractAt(
    'MidasAccessControl',
    acAddress,
  )) as MidasAccessControl;

  const allRoles = getAllRoles();
  const addressesMap: Record<
    string,
    {
      proxy: string;
      implementation: Constructor<ContractFactory>;
      constructorArgs?: unknown[];
      reinitializerParams?: {
        fn: string;
        args: unknown[];
      };
    }[]
  > = {
    ac: [
      {
        proxy: acAddress,
        implementation: MidasAccessControl__factory,
        reinitializerParams: {
          fn: 'initializeV2',
          args: [NULL_DELAY, [allRoles.tokenRoles.mGLOBAL.greenlisted]],
        },
      },
    ],
    mTbill: [
      // 1 gap on the token level (mTBILL), missing gaps in Blacklistable and WithMidasAccessControl
      {
        proxy: mTbillAddress,
        implementation: MToken__factory,
        constructorArgs: [
          allRoles.tokenRoles.mTBILL.tokenManager,
          allRoles.tokenRoles.mTBILL.minter,
          allRoles.tokenRoles.mTBILL.burner,
        ],
        reinitializerParams: {
          fn: 'initializeV2',
          args: [clawbackReceiver.address],
        },
      },
      // no gap in the product contract (MBtcDataFeed), has gap in DataFeed
      {
        proxy: mTbillDataFeedAddress,
        implementation: DataFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mTBILL.customFeedAdmin],
      },
      // has gap in the product contract (MBtcCustomAggregatorFeed) and no gap in CustomAggregatorV3CompatibleFeed
      {
        proxy: mTbillCustomFeedAddress,
        implementation: CustomAggregatorV3CompatibleFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mTBILL.customFeedAdmin],
      },
    ],
    mBtc: [
      // inherits mTBILL, has 2 __gap on token level (mToken, mBTC)
      {
        proxy: mBtcAddress,
        implementation: MToken__factory,
        constructorArgs: [
          allRoles.tokenRoles.mBTC.tokenManager,
          allRoles.tokenRoles.mBTC.minter,
          allRoles.tokenRoles.mBTC.burner,
        ],
        reinitializerParams: {
          fn: 'initializeV2',
          args: [clawbackReceiver.address],
        },
      },
      // no gap in the product contract (MBtcDataFeed), has gap in DataFeed
      {
        proxy: mBtcDataFeedAddress,
        implementation: DataFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mBTC.customFeedAdmin],
      },
      // no gap in the product contract (MBtcCustomAggregatorFeed) and no gap in CustomAggregatorV3CompatibleFeed
      {
        proxy: mBtcCustomFeedAddress,
        implementation: CustomAggregatorV3CompatibleFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mBTC.customFeedAdmin],
      },
    ],
    mGlobal: [
      // inherits mTokenPermissioned, has 3 __gap on the token level (mToken, mTokenPermissioned, mGLOBAL)
      {
        proxy: mGlobalAddress,
        implementation: MTokenPermissioned__factory,
        constructorArgs: [
          allRoles.tokenRoles.mGLOBAL.tokenManager,
          allRoles.tokenRoles.mGLOBAL.minter,
          allRoles.tokenRoles.mGLOBAL.burner,
          allRoles.tokenRoles.mGLOBAL.greenlisted,
        ],
        reinitializerParams: {
          fn: 'initializeV2',
          args: [clawbackReceiver.address],
        },
      },
      {
        // has gap in the product contract (MGlobalDataFeed), has gap in DataFeed
        proxy: mGlobalDataFeedAddress,
        implementation: DataFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mGLOBAL.customFeedAdmin],
      },
      // has gap in the product contract (MGlobalCustomFeedGrowth), has gap in CustomAggregatorV3CompatibleFeedGrowth
      {
        proxy: mGlobalCustomFeedGrowthAddress,
        implementation: CustomAggregatorV3CompatibleFeedGrowth__factory,
        constructorArgs: [allRoles.tokenRoles.mGLOBAL.customFeedAdmin],
      },
    ],
    mRox: [
      // inherits mToken, has 2 __gap on the token level (mToken, mROX)
      {
        proxy: mRoxAddress,
        implementation: MToken__factory,
        constructorArgs: [
          allRoles.tokenRoles.mROX.tokenManager,
          allRoles.tokenRoles.mROX.minter,
          allRoles.tokenRoles.mROX.burner,
        ],
        reinitializerParams: {
          fn: 'initializeV2',
          args: [clawbackReceiver.address],
        },
      },
    ],
  };

  await asyncForEach(Object.entries(addressesMap), async ([, values]) => {
    await asyncForEach(
      values,
      async (val) => {
        await hre.upgrades.upgradeProxy(
          val.proxy,
          new val.implementation(proxyAdminOwner),
          {
            constructorArgs: val.constructorArgs ?? [],
            call: val.reinitializerParams
              ? {
                  fn: val.reinitializerParams.fn,
                  args: val.reinitializerParams.args,
                }
              : undefined,
          },
        );
      },
      true,
    );
  });

  const securityCouncilMembers = [
    signers[0],
    signers[1],
    signers[2],
    signers[3],
    signers[4],
  ];

  const pauseManager = await deployProxyContract<MidasPauseManager>(
    'MidasPauseManager',
    [acAddress, NO_DELAY, 3600],
  );

  const timelockManager = await deployProxyContract<MidasTimelockManager>(
    'MidasTimelockManager',
    [acAddress, 100, securityCouncilMembers.map((s) => s.address)],
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

  const mTbill = (await ethers.getContractAt(
    'mToken',
    mTbillAddress,
  )) as MToken;
  const mGlobal = (await ethers.getContractAt(
    'mTokenPermissioned',
    mGlobalAddress,
  )) as MTokenPermissioned;
  const mTbillDataFeed = (await ethers.getContractAt(
    'DataFeed',
    mTbillDataFeedAddress,
  )) as DataFeed;
  const mTbillCustomFeed = (await ethers.getContractAt(
    'CustomAggregatorV3CompatibleFeed',
    mTbillCustomFeedAddress,
  )) as CustomAggregatorV3CompatibleFeed;
  const mGlobalDataFeed = (await ethers.getContractAt(
    'DataFeed',
    mGlobalDataFeedAddress,
  )) as DataFeed;
  const mGlobalCustomFeedGrowth = (await ethers.getContractAt(
    'CustomAggregatorV3CompatibleFeedGrowth',
    mGlobalCustomFeedGrowthAddress,
  )) as CustomAggregatorV3CompatibleFeedGrowth;

  const mTbillHolders = await Promise.all(
    [
      '0x0461bD693caE49bE9d030E5c212e080F9c78B846',
      '0xc0C4Ab1D389F9540A50D1188226D7384a68cE788',
    ].map((address) => impersonateAndFundAccount(address)),
  );

  const mGlobalHolders = await Promise.all(
    [
      '0x882C825405fBBE45DCc1ad52b639aFbC4592EDb7',
      '0xaB05c0DB9D26e96A9dcEDCAFCA23341316F6fe6F',
    ].map((address) => impersonateAndFundAccount(address)),
  );

  return {
    proxyAdmin,
    proxyAdminOwner,
    acDefaultAdmin,
    accessControl,
    pauseManager,
    timelockManager,
    timelock,
    securityCouncilMembers,
    mTbill,
    mGlobal,
    mTbillDataFeed,
    mTbillCustomFeed,
    mGlobalDataFeed,
    mGlobalCustomFeedGrowth,
    mTbillHolders,
    mGlobalHolders,
    clawbackReceiver,
  };
}

export type MainnetUpgradeFixture = Awaited<
  ReturnType<typeof mainnetUpgradeFixture>
>;
