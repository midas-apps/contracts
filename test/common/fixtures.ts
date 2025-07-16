import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';

import { postDeploymentTest } from './post-deploy.helpers';

import { getAllRoles } from '../../helpers/roles';
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
  CustomAggregatorV3CompatibleFeedTester__factory,
  // eslint-disable-next-line camelcase
  SanctionsListMock__factory,
  // eslint-disable-next-line camelcase
  WithSanctionsListTester__factory,
  // eslint-disable-next-line camelcase
  RedemptionTest__factory,
  // eslint-disable-next-line camelcase
  USTBRedemptionMock__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultWithBUIDLTest__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultWithUSTBTest__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultWithSwapperTest__factory,
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedDiscountedTester__factory,
  // eslint-disable-next-line camelcase
  DepositVaultWithUSTBTest__factory,
  // eslint-disable-next-line camelcase
  USTBMock__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [
    owner,
    customRecipient,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    liquidityProvider,
    ...regularAccounts
  ] = await ethers.getSigners();

  const allRoles = getAllRoles();

  // main contracts
  const accessControl = await new MidasAccessControlTest__factory(
    owner,
  ).deploy();
  await accessControl.initialize();

  const mockedSanctionsList = await new SanctionsListMock__factory(
    owner,
  ).deploy();

  const withSanctionsListTester = await new WithSanctionsListTester__factory(
    owner,
  ).deploy();

  await withSanctionsListTester.initialize(
    accessControl.address,
    mockedSanctionsList.address,
  );

  const mTBILL = await new MTBILLTest__factory(owner).deploy();
  await expect(mTBILL.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mTBILL.initialize(accessControl.address);

  // separate mTBILL instance for swapper testing
  const mBASIS = await new MTBILLTest__factory(owner).deploy();
  await mBASIS.initialize(accessControl.address);

  const excludedRoles = [
    allRoles.common.blacklisted,
    allRoles.common.greenlisted,
  ];

  const rolesFlat = [
    Object.values(allRoles.common),
    Object.values(allRoles.tokenRoles).map((v) => Object.values(v)),
  ]
    .flat(2)
    .filter((v) => v !== '-' && !!v && !excludedRoles.includes(v)) as string[];

  await expect(
    accessControl.grantRoleMult(
      rolesFlat,
      rolesFlat.map((_) => owner.address),
    ),
  ).not.reverted;

  const mockedAggregator = await new AggregatorV3Mock__factory(owner).deploy();
  const mockedAggregatorDecimals = await mockedAggregator.decimals();

  const mockedAggregatorMToken = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();

  const mockedAggregatorMBasis = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();

  const mockedAggregatorMTokenDecimals =
    await mockedAggregatorMToken.decimals();

  await mockedAggregator.setRoundData(
    parseUnits('1.02', mockedAggregatorDecimals),
  );

  await mockedAggregatorMToken.setRoundData(
    parseUnits('5', mockedAggregatorMTokenDecimals),
  );

  await mockedAggregatorMBasis.setRoundData(
    parseUnits('3', await mockedAggregatorMBasis.decimals()),
  );

  const dataFeed = await new DataFeedTest__factory(owner).deploy();
  await dataFeed.initialize(
    accessControl.address,
    mockedAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorDecimals),
    parseUnits('10000', mockedAggregatorDecimals),
  );

  const mTokenToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await mTokenToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMToken.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorMTokenDecimals),
    parseUnits('10000', mockedAggregatorMTokenDecimals),
  );

  const mBasisToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await mBasisToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMBasis.address,
    3 * 24 * 3600,
    parseUnits('0.1', await mockedAggregatorMBasis.decimals()),
    parseUnits('10000', await mockedAggregatorMBasis.decimals()),
  );

  const depositVault = await new DepositVaultTest__factory(owner).deploy();

  await depositVault.initialize(
    accessControl.address,
    {
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
    },
    {
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
    },
    {
      instantFee: 100,
      instantDailyLimit: parseUnits('100000'),
    },
    mockedSanctionsList.address,
    1,
    parseUnits('100'),
    0,
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_MINT_OPERATOR_ROLE(),
    depositVault.address,
  );

  const redemptionVault = await new RedemptionVaultTest__factory(
    owner,
  ).deploy();

  await redemptionVault.initialize(
    accessControl.address,
    {
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
    },
    {
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
    },
    {
      instantFee: 100,
      instantDailyLimit: parseUnits('100000'),
    },
    mockedSanctionsList.address,
    1,
    1000,
    {
      fiatAdditionalFee: 100,
      fiatFlatFee: parseUnits('1'),
      minFiatRedeemAmount: 1000,
    },
    requestRedeemer.address,
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVault.address,
  );

  const stableCoins = {
    usdc: await new ERC20Mock__factory(owner).deploy(8),
    usdt: await new ERC20Mock__factory(owner).deploy(18),
    dai: await new ERC20Mock__factory(owner).deploy(9),
  };

  const otherCoins = {
    wbtc: await new ERC20Mock__factory(owner).deploy(8),
  };

  /* Redemption Vault With BUIDL */

  const buidl = await new ERC20Mock__factory(owner).deploy(8);
  const buidlRedemption = await new RedemptionTest__factory(owner).deploy(
    buidl.address,
    stableCoins.usdc.address,
  );
  await stableCoins.usdc.mint(buidlRedemption.address, parseUnits('1000000'));

  const redemptionVaultWithBUIDL =
    await new RedemptionVaultWithBUIDLTest__factory(owner).deploy();

  await redemptionVaultWithBUIDL[
    'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,uint256,uint256)'
  ](
    accessControl.address,
    {
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
    },
    {
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
    },
    {
      instantFee: 100,
      instantDailyLimit: parseUnits('100000'),
    },
    mockedSanctionsList.address,
    1,
    1000,
    {
      fiatAdditionalFee: 100,
      fiatFlatFee: parseUnits('1'),
      minFiatRedeemAmount: 1000,
    },
    requestRedeemer.address,
    buidlRedemption.address,
    parseUnits('250000', 6),
    parseUnits('250000', 6),
  );
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithBUIDL.address,
  );

  const ustbToken = await new USTBMock__factory(owner).deploy();

  /* Deposit Vault With USTB */

  const depositVaultWithUSTB = await new DepositVaultWithUSTBTest__factory(
    owner,
  ).deploy();

  await depositVaultWithUSTB[
    'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,address)'
  ](
    accessControl.address,
    {
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
    },
    {
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
    },
    {
      instantFee: 100,
      instantDailyLimit: parseUnits('100000'),
    },
    mockedSanctionsList.address,
    1,
    parseUnits('100'),
    0,
    ustbToken.address,
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_MINT_OPERATOR_ROLE(),
    depositVaultWithUSTB.address,
  );

  /* Redemption Vault With USTB */

  const ustbRedemption = await new USTBRedemptionMock__factory(owner).deploy(
    ustbToken.address,
    stableCoins.usdc.address,
  );
  await stableCoins.usdc.mint(ustbRedemption.address, parseUnits('1000000'));

  const redemptionVaultWithUSTB =
    await new RedemptionVaultWithUSTBTest__factory(owner).deploy();

  await redemptionVaultWithUSTB[
    'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)'
  ](
    accessControl.address,
    {
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
    },
    {
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
    },
    {
      instantFee: 100,
      instantDailyLimit: parseUnits('100000'),
    },
    mockedSanctionsList.address,
    1,
    1000,
    {
      fiatAdditionalFee: 100,
      fiatFlatFee: parseUnits('1'),
      minFiatRedeemAmount: 1000,
    },
    requestRedeemer.address,
    ustbRedemption.address,
  );
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithUSTB.address,
  );

  /* Redemption Vault With Swapper */

  const redemptionVaultWithSwapper =
    await new RedemptionVaultWithSwapperTest__factory(owner).deploy();

  await redemptionVaultWithSwapper[
    'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
  ](
    accessControl.address,
    {
      mToken: mBASIS.address,
      mTokenDataFeed: mBasisToUsdDataFeed.address,
    },
    {
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
    },
    {
      instantFee: 100,
      instantDailyLimit: parseUnits('100000'),
    },
    mockedSanctionsList.address,
    1,
    1000,
    {
      fiatAdditionalFee: 100,
      fiatFlatFee: parseUnits('1'),
      minFiatRedeemAmount: 1000,
    },
    requestRedeemer.address,
    redemptionVault.address,
    liquidityProvider.address,
  );

  await redemptionVault.addWaivedFeeAccount(redemptionVaultWithSwapper.address);
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithSwapper.address,
  );

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

  const customFeedDiscounted =
    await new CustomAggregatorV3CompatibleFeedDiscountedTester__factory(
      owner,
    ).deploy(customFeed.address, parseUnits('10', 8));

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

  const offChainUsdToken = constants.AddressZero;

  // role granting testers
  await accessControl.grantRole(
    allRoles.common.blacklistedOperator,
    blackListableTester.address,
  );
  await accessControl.grantRole(
    allRoles.common.greenlistedOperator,
    greenListableTester.address,
  );
  const greenlistToggler = await greenListableTester.GREENLIST_TOGGLER_ROLE();
  await accessControl.grantRole(greenlistToggler, owner.address);

  await postDeploymentTest(hre, {
    accessControl,
    aggregator: mockedAggregator,
    dataFeed,
    depositVault,
    owner,
    redemptionVault,
    aggregatorMToken: mockedAggregatorMToken,
    dataFeedMToken: mTokenToUsdDataFeed,
    mTBILL,
    minMTokenAmountForFirstDeposit: '0',
    minAmount: parseUnits('100'),
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
    parseUnits('1.07778', mockedAggregatorMTokenDecimals),
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
    parseUnits('1.07778', mockedAggregatorMTokenDecimals),
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
    customFeedDiscounted,
    mTBILL,
    mBASIS,
    redemptionVaultWithSwapper,
    mBasisToUsdDataFeed,
    accessControl,
    wAccessControlTester,
    roles: { ...allRoles, greenlistToggler },
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
    mTokenToUsdDataFeed,
    mockedAggregatorMToken,
    mockedAggregatorMBasis,
    offChainUsdToken,
    mockedAggregatorMTokenDecimals,
    tokensReceiver,
    feeReceiver,
    dataFeedDeprecated,
    dataFeedUnhealthy,
    withSanctionsListTester,
    mockedSanctionsList,
    requestRedeemer,
    buidl,
    buidlRedemption,
    redemptionVaultWithBUIDL,
    redemptionVaultWithUSTB,
    liquidityProvider,
    otherCoins,
    ustbToken,
    ustbRedemption,
    customRecipient,
    depositVaultWithUSTB,
  };
};
