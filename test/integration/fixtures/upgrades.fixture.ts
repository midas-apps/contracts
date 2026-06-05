import { mine, setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { ContractFactory } from 'ethers';
import { parseUnits } from 'ethers/lib.esm/utils';
import { ethers } from 'hardhat';
import hre from 'hardhat';

import { rpcUrls } from '../../../config';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
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
} from '../../../typechain-types';
import { Constructor } from '../../common/common.helpers';
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

  const signers = await ethers.getSigners();

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
    }[]
  > = {
    mTbill: [
      {
        proxy: mTbillAddress,
        implementation: MToken__factory,
        constructorArgs: [
          allRoles.tokenRoles.mTBILL.tokenManager,
          allRoles.tokenRoles.mTBILL.minter,
          allRoles.tokenRoles.mTBILL.burner,
          mTokensMetadata.mTBILL.name,
          mTokensMetadata.mTBILL.symbol,
        ],
      },
      {
        proxy: mTbillDataFeedAddress,
        implementation: DataFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mTBILL.customFeedAdmin],
      },
      {
        proxy: mTbillCustomFeedAddress,
        implementation: CustomAggregatorV3CompatibleFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mTBILL.customFeedAdmin],
      },
    ],
    ac: [{ proxy: acAddress, implementation: MidasAccessControl__factory }],
    mGlobal: [
      {
        proxy: mGlobalAddress,
        implementation: MToken__factory,
        constructorArgs: [
          allRoles.tokenRoles.mGLOBAL.tokenManager,
          allRoles.tokenRoles.mGLOBAL.minter,
          allRoles.tokenRoles.mGLOBAL.burner,
          mTokensMetadata.mGLOBAL.name,
          mTokensMetadata.mGLOBAL.symbol,
        ],
      },
      {
        proxy: mGlobalDataFeedAddress,
        implementation: DataFeed__factory,
        constructorArgs: [allRoles.tokenRoles.mGLOBAL.customFeedAdmin],
      },
      {
        proxy: mGlobalCustomFeedGrowthAddress,
        implementation: CustomAggregatorV3CompatibleFeedGrowth__factory,
        constructorArgs: [allRoles.tokenRoles.mGLOBAL.customFeedAdmin],
      },
    ],
  };

  for (const [, values] of Object.entries(addressesMap)) {
    for (const val of values) {
      console.log(`Upgrading ${val.proxy}`);

      await hre.upgrades.upgradeProxy(
        val.proxy,
        new val.implementation(proxyAdminOwner),
        { constructorArgs: val.constructorArgs ?? [] },
      );
    }
  }

  const securityCouncilMembers = [
    signers[0],
    signers[1],
    signers[2],
    signers[3],
    signers[4],
  ];

  const pauseManager = await deployProxyContract<MidasPauseManager>(
    'MidasPauseManager',
    [acAddress],
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
    'MToken',
    mTbillAddress,
  )) as MToken;
  const mGlobal = (await ethers.getContractAt(
    'MToken',
    mGlobalAddress,
  )) as MToken;
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
  };
}

export type MainnetUpgradeFixture = Awaited<
  ReturnType<typeof mainnetUpgradeFixture>
>;
