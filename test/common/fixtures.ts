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
  MBASISTest__factory,
  // eslint-disable-next-line camelcase
  EUSDTest__factory,
  // eslint-disable-next-line camelcase
  EUsdRedemptionVaultTest__factory,
  // eslint-disable-next-line camelcase
  CustomAggregatorV3CompatibleFeedTester__factory,
  // eslint-disable-next-line camelcase
  SanctionsListMock__factory,
  // eslint-disable-next-line camelcase
  WithSanctionsListTester__factory,
  // eslint-disable-next-line camelcase
  RedemptionTest__factory,
  // eslint-disable-next-line camelcase
  RedemptionVaultWithBUIDLTest__factory,
  // eslint-disable-next-line camelcase
  MBasisRedemptionVaultWithSwapperTest__factory,
  // eslint-disable-next-line camelcase
  MBTCTest__factory,
  // eslint-disable-next-line camelcase
  MEDGETest__factory,
  // eslint-disable-next-line camelcase
  MRE7Test__factory,
  // eslint-disable-next-line camelcase
  MMEVTest__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [
    owner,
    eUsdOwner,
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

  const mBASIS = await new MBASISTest__factory(owner).deploy();
  await expect(mBASIS.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mBASIS.initialize(accessControl.address);

  const eUSD = await new EUSDTest__factory(owner).deploy();
  await expect(eUSD.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await eUSD.initialize(accessControl.address);

  const mBTC = await new MBTCTest__factory(owner).deploy();
  await expect(mBTC.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mBTC.initialize(accessControl.address);

  const mEDGE = await new MEDGETest__factory(owner).deploy();
  await expect(mEDGE.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mEDGE.initialize(accessControl.address);

  const mRE7 = await new MRE7Test__factory(owner).deploy();
  await expect(mRE7.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mRE7.initialize(accessControl.address);

  const mMEV = await new MMEVTest__factory(owner).deploy();
  await expect(mMEV.initialize(ethers.constants.AddressZero)).to.be.reverted;
  await mMEV.initialize(accessControl.address);

  const rolesFlat = [
    Object.values(allRoles.common),
    Object.values(allRoles.tokenRoles).map((v) => Object.values(v)),
  ]
    .flat(2)
    .filter((v) => v !== '-');

  await accessControl.grantRoleMult(
    rolesFlat,
    rolesFlat.map((_) => owner.address),
  );

  const mockedAggregator = await new AggregatorV3Mock__factory(owner).deploy();
  const mockedAggregatorDecimals = await mockedAggregator.decimals();

  const mockedAggregatorMToken = await new AggregatorV3Mock__factory(
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

  const depositVault = await new DepositVaultTest__factory(owner).deploy();
  await expect(
    depositVault.initialize(
      ethers.constants.AddressZero,
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
      parseUnits('100'),
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      {
        mToken: ethers.constants.AddressZero,
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
      parseUnits('100'),
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: ethers.constants.AddressZero,
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
      parseUnits('100'),
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: mTokenToUsdDataFeed.address,
      },
      {
        feeReceiver: ethers.constants.AddressZero,
        tokensReceiver: tokensReceiver.address,
      },
      {
        instantFee: 100,
        instantDailyLimit: parseUnits('100000'),
      },
      mockedSanctionsList.address,
      1,
      parseUnits('100'),
      parseUnits('100'),
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: mTokenToUsdDataFeed.address,
      },
      {
        feeReceiver: feeReceiver.address,
        tokensReceiver: ethers.constants.AddressZero,
      },
      {
        instantFee: 100,
        instantDailyLimit: parseUnits('100000'),
      },
      mockedSanctionsList.address,
      1,
      parseUnits('100'),
      parseUnits('100'),
    ),
  ).to.be.reverted;
  await expect(
    depositVault.initialize(
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
        instantFee: 100001,
        instantDailyLimit: parseUnits('100000'),
      },
      mockedSanctionsList.address,
      1,
      parseUnits('100'),
      parseUnits('100'),
    ),
  ).to.be.reverted;
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

  await expect(
    redemptionVault.initialize(
      ethers.constants.AddressZero,
      {
        mToken: ethers.constants.AddressZero,
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
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      requestRedeemer.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: ethers.constants.AddressZero,
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
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      requestRedeemer.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: mTokenToUsdDataFeed.address,
      },
      {
        feeReceiver: ethers.constants.AddressZero,
        tokensReceiver: tokensReceiver.address,
      },
      {
        instantFee: 100,
        instantDailyLimit: parseUnits('100000'),
      },
      mockedSanctionsList.address,
      1,
      parseUnits('100'),
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      requestRedeemer.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: mTokenToUsdDataFeed.address,
      },
      {
        feeReceiver: feeReceiver.address,
        tokensReceiver: ethers.constants.AddressZero,
      },
      {
        instantFee: 100,
        instantDailyLimit: parseUnits('100000'),
      },
      mockedSanctionsList.address,
      1,
      parseUnits('100'),
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      requestRedeemer.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
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
        instantFee: 10001,
        instantDailyLimit: parseUnits('100000'),
      },
      mockedSanctionsList.address,
      1,
      parseUnits('100'),
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      requestRedeemer.address,
    ),
  ).to.be.reverted;
  await expect(
    redemptionVault.initialize(
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
      {
        fiatAdditionalFee: 10001,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      requestRedeemer.address,
    ),
  ).to.be.reverted;

  await expect(
    redemptionVault.initialize(
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
      {
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      constants.AddressZero,
    ),
  ).to.be.reverted;

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

  const buidl = await new ERC20Mock__factory(owner).deploy(8);

  const buidlRedemption = await new RedemptionTest__factory(owner).deploy(
    buidl.address,
    stableCoins.usdc.address,
  );

  await stableCoins.usdc.mint(buidlRedemption.address, parseUnits('1000000'));

  const redemptionVaultWithBUIDL =
    await new RedemptionVaultWithBUIDLTest__factory(owner).deploy();

  await expect(
    redemptionVaultWithBUIDL[
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address)'
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
      {
        fiatAdditionalFee: 10000,
        fiatFlatFee: parseUnits('1'),
        minFiatRedeemAmount: parseUnits('100'),
      },
      constants.AddressZero,
    ),
  ).to.be.reverted;
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
    mTBILL,
    eUsdOwner,
    mBASIS,
    eUSD,
    mBTC,
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
    liquidityProvider,
    otherCoins,
    mEDGE,
    mRE7,
    mMEV,
  };
};
