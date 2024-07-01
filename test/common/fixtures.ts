import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';

import { getAllRoles } from './common.helpers';
import { initGrantRoles, postDeploymentTest } from './post-deploy.helpers';

import {
  // eslint-disable-next-line camelcase
  AggregatorV3Mock__factory,
  // eslint-disable-next-line camelcase
  BlacklistableTester__factory,
  // eslint-disable-next-line camelcase
  DepositVaultTest__factory,
  // eslint-disable-next-line camelcase
  ERC20Mock__factory,
  // eslint-disable-next-line camelcase
  GreenlistableTester__factory,
  // eslint-disable-next-line camelcase
  MidasAccessControlTest__factory,
  // eslint-disable-next-line camelcase
  PausableTester__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultTest__factory,
  // eslint-disable-next-line camelcase
  MTBILLTest__factory,
  // eslint-disable-next-line camelcase
  WithMidasAccessControlTester__factory,
  // eslint-disable-next-line camelcase
  DataFeedTest__factory,
  // eslint-disable-next-line camelcase
  AggregatorV3DeprecatedMock__factory,
  // eslint-disable-next-line camelcase
  AggregatorV3UnhealthyMock__factory,
  // eslint-disable-next-line camelcase
  MBASISTest__factory,
  // eslint-disable-next-line camelcase
  EUSDTest__factory,
  // eslint-disable-next-line camelcase
  EUsdRedemptionVaultTest__factory,
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedTester__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [owner, eUsdOwner, tokensReceiver, ...regularAccounts] =
    await ethers.getSigners();

  // main contracts
  const accessControl = await new MidasAccessControlTest__factory(
    owner,
  ).deploy();
  await accessControl.initialize();

  const mTBILL = await new MTBILLTest__factory(owner).deploy();
  await expect(mTBILL.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mTBILL.initialize(accessControl.address);

  const mBASIS = await new MBASISTest__factory(owner).deploy();
  await expect(mBASIS.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mBASIS.initialize(accessControl.address);

  const eUSD = await new EUSDTest__factory(owner).deploy();
  await expect(eUSD.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await eUSD.initialize(accessControl.address);

  await accessControl.grantRoleMult(
    [
      await mBASIS.M_BASIS_BURN_OPERATOR_ROLE(),
      await mBASIS.M_BASIS_MINT_OPERATOR_ROLE(),
      await mBASIS.M_BASIS_PAUSE_OPERATOR_ROLE(),
    ],
    [owner.address, owner.address, owner.address],
  );

  await accessControl.grantRoleMult(
    [
      await eUSD.E_USD_BURN_OPERATOR_ROLE(),
      await eUSD.E_USD_MINT_OPERATOR_ROLE(),
      await eUSD.E_USD_PAUSE_OPERATOR_ROLE(),
    ],
    [owner.address, owner.address, owner.address],
  );

  const mockedAggregator = await new AggregatorV3Mock__factory(owner).deploy();
  const mockedAggregatorDecimals = await mockedAggregator.decimals();

  const mockedAggregatorEur = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorEurDecimals = await mockedAggregatorEur.decimals();

  await mockedAggregator.setRoundData(
    parseUnits('5', mockedAggregatorDecimals),
  );

  await mockedAggregatorEur.setRoundData(
    parseUnits('1.07778', mockedAggregatorEurDecimals),
  );

  const dataFeed = await new DataFeedTest__factory(owner).deploy();
  await dataFeed.initialize(
    accessControl.address,
    mockedAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorDecimals),
    parseUnits('10000', mockedAggregatorDecimals),
  );

  const eurToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await eurToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorEur.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorEurDecimals),
    parseUnits('10000', mockedAggregatorEurDecimals),
  );

  const depositVault = await new DepositVaultTest__factory(owner).deploy();
  await expect(
    depositVault.initialize(
      ethers.constants.AddressZero,
      mTBILL.address,
      eurToUsdDataFeed.address,
      0,
      tokensReceiver.address,
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      ethers.constants.AddressZero,
      eurToUsdDataFeed.address,
      0,
      tokensReceiver.address,
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      mTBILL.address,
      ethers.constants.AddressZero,
      0,
      tokensReceiver.address,
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      mTBILL.address,
      eurToUsdDataFeed.address,
      0,
      ethers.constants.AddressZero,
    ),
  ).to.be.reverted;
  await depositVault.initialize(
    accessControl.address,
    mTBILL.address,
    eurToUsdDataFeed.address,
    0,
    tokensReceiver.address,
  );

  const redemptionVault = await new RedemptionVaultTest__factory(
    owner,
  ).deploy();

  await expect(
    redemptionVault.initialize(
      ethers.constants.AddressZero,
      mTBILL.address,
      tokensReceiver.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
      accessControl.address,
      ethers.constants.AddressZero,
      tokensReceiver.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
      accessControl.address,
      mTBILL.address,
      ethers.constants.AddressZero,
    ),
  ).to.be.reverted;

  await redemptionVault.initialize(
    accessControl.address,
    mTBILL.address,
    tokensReceiver.address,
  );

  const eUSdRedemptionVault = await new EUsdRedemptionVaultTest__factory(
    owner,
  ).deploy();

  await eUSdRedemptionVault.initialize(
    accessControl.address,
    eUSD.address,
    tokensReceiver.address,
  );

  await accessControl.grantRoleMult(
    [
      await eUSdRedemptionVault.DEFAULT_ADMIN_ROLE(),
      await eUSdRedemptionVault.E_USD_GREENLIST_OPERATOR_ROLE(),
      await eUSdRedemptionVault.E_USD_REDEMPTION_VAULT_ADMIN_ROLE(),
      await eUSdRedemptionVault.E_USD_VAULT_ROLES_OPERATOR(),
    ],
    [
      eUsdOwner.address,
      eUsdOwner.address,
      eUsdOwner.address,
      eUsdOwner.address,
    ],
  );

  const stableCoins = {
    usdc: await new ERC20Mock__factory(owner).deploy(8),
    usdt: await new ERC20Mock__factory(owner).deploy(18),
    dai: await new ERC20Mock__factory(owner).deploy(9),
  };

  // eslint-disable-next-line camelcase
  const customFeed = await new CustomAggregatorV3CompatibleFeedTester__factory(
    owner,
  ).deploy();

  await customFeed.initialize(
    accessControl.address,
    2,
    parseUnits('10000', 8),
    parseUnits('1', 8),
    'Custom Data Feed',
  );

  // role granting testers
  await accessControl.grantRole(
    await customFeed.CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
    owner.address,
  );

  const manualFulfillmentToken =
    await redemptionVault.MANUAL_FULLFILMENT_TOKEN();

  // testers
  const wAccessControlTester = await new WithMidasAccessControlTester__factory(
    owner,
  ).deploy();
  await wAccessControlTester.initialize(accessControl.address);

  const blackListableTester = await new BlacklistableTester__factory(
    owner,
  ).deploy();
  await blackListableTester.initialize(accessControl.address);

  const greenListableTester = await new GreenlistableTester__factory(
    owner,
  ).deploy();
  await greenListableTester.initialize(accessControl.address);

  const pausableTester = await new PausableTester__factory(owner).deploy();
  await pausableTester.initialize(accessControl.address);

  const roles = await getAllRoles(accessControl);

  const offChainUsdToken = constants.AddressZero;

  // role granting main
  await initGrantRoles({
    accessControl,
    depositVault,
    owner,
    redemptionVault,
    mTBILL,
  });

  // role granting testers
  await accessControl.grantRole(
    roles.blacklistedOperator,
    blackListableTester.address,
  );
  await accessControl.grantRole(
    roles.greenlistedOperator,
    greenListableTester.address,
  );

  await postDeploymentTest(hre, {
    accessControl,
    aggregator: mockedAggregator,
    dataFeed,
    depositVault,
    owner,
    redemptionVault,
    aggregatorEur: mockedAggregatorEur,
    dataFeedEur: eurToUsdDataFeed,
    mTBILL,
    minAmountToDeposit: '0',
    tokensReceiver: tokensReceiver.address,
  });

  const mockedDeprecatedAggregator =
    await new AggregatorV3DeprecatedMock__factory(owner).deploy();
  const mockedDeprecatedAggregatorDecimals =
    await mockedDeprecatedAggregator.decimals();

  await mockedDeprecatedAggregator.setRoundData(
    parseUnits('5', mockedAggregatorDecimals),
  );

  await mockedDeprecatedAggregator.setRoundData(
    parseUnits('1.07778', mockedAggregatorEurDecimals),
  );
  const dataFeedDeprecated = await new DataFeedTest__factory(owner).deploy();
  await dataFeedDeprecated.initialize(
    accessControl.address,
    mockedDeprecatedAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedDeprecatedAggregatorDecimals),
    parseUnits('10000', mockedDeprecatedAggregatorDecimals),
  );

  const mockedUnhealthyAggregator =
    await new AggregatorV3UnhealthyMock__factory(owner).deploy();
  const mockedUnhealthyAggregatorDecimals =
    await mockedUnhealthyAggregator.decimals();

  await mockedUnhealthyAggregator.setRoundData(
    parseUnits('5', mockedAggregatorDecimals),
  );

  await mockedUnhealthyAggregator.setRoundData(
    parseUnits('1.07778', mockedAggregatorEurDecimals),
  );
  const dataFeedUnhealthy = await new DataFeedTest__factory(owner).deploy();
  await dataFeedUnhealthy.initialize(
    accessControl.address,
    mockedUnhealthyAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedUnhealthyAggregatorDecimals),
    parseUnits('10000', mockedUnhealthyAggregatorDecimals),
  );

  return {
    customFeed,
    eUSdRedemptionVault,
    mTBILL,
    eUsdOwner,
    mBASIS,
    eUSD,
    accessControl,
    wAccessControlTester,
    roles,
    owner,
    regularAccounts,
    blackListableTester,
    greenListableTester,
    pausableTester,
    dataFeed,
    mockedAggregator,
    mockedAggregatorDecimals,
    depositVault,
    redemptionVault,
    stableCoins,
    manualFulfillmentToken,
    eurToUsdDataFeed,
    mockedAggregatorEur,
    offChainUsdToken,
    mockedAggregatorEurDecimals,
    tokensReceiver,
    dataFeedDeprecated,
    dataFeedUnhealthy,
  };
};
