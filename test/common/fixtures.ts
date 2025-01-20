import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';

import { getAllRoles } from './common.helpers';
import { postDeploymentTest } from './post-deploy.helpers';

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
  MEDGETest__factory,
} from '../../typechain-types';
import { mEdge } from '../../typechain-types/contracts';

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
      await mBTC.M_BTC_BURN_OPERATOR_ROLE(),
      await mBTC.M_BTC_MINT_OPERATOR_ROLE(),
      await mBTC.M_BTC_PAUSE_OPERATOR_ROLE(),
    ],
    [owner.address, owner.address, owner.address],
  );

  await accessControl.grantRoleMult(
    [
      await mEDGE.M_EDGE_BURN_OPERATOR_ROLE(),
      await mEDGE.M_EDGE_MINT_OPERATOR_ROLE(),
      await mEDGE.M_EDGE_PAUSE_OPERATOR_ROLE(),
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

  const mockedAggregatorMToken = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorMTokenDecimals =
    await mockedAggregatorMToken.decimals();

  const mockedAggregatorMBASIS = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorMBASISDecimals =
    await mockedAggregatorMBASIS.decimals();

  const mockedAggregatorMEDGE = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorMEDGEDecimals = await mockedAggregatorMEDGE.decimals();

  const mockedAggregatorMBTC = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorMBTCDecimals = await mockedAggregatorMBTC.decimals();

  const mockedAggregatorWBTC = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  const mockedAggregatorWBTCDecimals = await mockedAggregatorWBTC.decimals();

  await mockedAggregator.setRoundData(
    parseUnits('1.02', mockedAggregatorDecimals),
  );

  await mockedAggregatorMToken.setRoundData(
    parseUnits('5', mockedAggregatorMTokenDecimals),
  );

  await mockedAggregatorMBASIS.setRoundData(
    parseUnits('3', mockedAggregatorMBASISDecimals),
  );

  await mockedAggregatorMBTC.setRoundData(
    parseUnits('1.01', mockedAggregatorMBTCDecimals),
  );

  await mockedAggregatorWBTC.setRoundData(
    parseUnits('1', mockedAggregatorWBTCDecimals),
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

  const mBASISToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await mBASISToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMBASIS.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorMBASISDecimals),
    parseUnits('10000', mockedAggregatorMBASISDecimals),
  );

  const mBTCToBtcDataFeed = await new DataFeedTest__factory(owner).deploy();
  await mBTCToBtcDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMBTC.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorMBTCDecimals),
    parseUnits('10000', mockedAggregatorMBTCDecimals),
  );

  const mEDGEToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await mEDGEToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMEDGE.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorMEDGEDecimals),
    parseUnits('10000', mockedAggregatorMEDGEDecimals),
  );

  const WBTCToBtcDataFeed = await new DataFeedTest__factory(owner).deploy();
  await WBTCToBtcDataFeed.initialize(
    accessControl.address,
    mockedAggregatorWBTC.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorWBTCDecimals),
    parseUnits('10000', mockedAggregatorWBTCDecimals),
  );

  const mBtcDepositVault = await new DepositVaultTest__factory(owner).deploy();

  await mBtcDepositVault.initialize(
    accessControl.address,
    {
      mToken: mBTC.address,
      mTokenDataFeed: mBTCToBtcDataFeed.address,
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

  const mBtcRedemptionVault = await new RedemptionVaultTest__factory(
    owner,
  ).deploy();
  await mBtcRedemptionVault.initialize(
    accessControl.address,
    {
      mToken: mBTC.address,
      mTokenDataFeed: mBTCToBtcDataFeed.address,
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

  await accessControl.grantRoleMult(
    [
      await mBTC.M_BTC_MINT_OPERATOR_ROLE(),
      await mBTC.M_BTC_BURN_OPERATOR_ROLE(),
    ],
    [mBtcDepositVault.address, mBtcRedemptionVault.address],
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

  const eUSdRedemptionVault = await new EUsdRedemptionVaultTest__factory(
    owner,
  ).deploy();

  await eUSdRedemptionVault.initialize(
    accessControl.address,
    {
      mToken: eUSD.address,
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

  const mBasisRedemptionVaultWithSwapper =
    await new MBasisRedemptionVaultWithSwapperTest__factory(owner).deploy();

  await expect(
    mBasisRedemptionVaultWithSwapper[
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
    ](
      accessControl.address,
      {
        mToken: mBASIS.address,
        mTokenDataFeed: mBASISToUsdDataFeed.address,
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
      constants.AddressZero,
      liquidityProvider.address,
    ),
  ).to.be.reverted;

  await expect(
    mBasisRedemptionVaultWithSwapper[
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
    ](
      accessControl.address,
      {
        mToken: mBASIS.address,
        mTokenDataFeed: mBASISToUsdDataFeed.address,
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
      constants.AddressZero,
    ),
  ).to.be.reverted;

  await mBasisRedemptionVaultWithSwapper[
    'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address,address)'
  ](
    accessControl.address,
    {
      mToken: mBASIS.address,
      mTokenDataFeed: mBASISToUsdDataFeed.address,
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

  await accessControl.grantRole(
    mBASIS.M_BASIS_BURN_OPERATOR_ROLE(),
    mBasisRedemptionVaultWithSwapper.address,
  );
  await accessControl.grantRole(
    mBasisRedemptionVaultWithSwapper.M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE(),
    owner.address,
  );

  await redemptionVault.addWaivedFeeAccount(
    mBasisRedemptionVaultWithSwapper.address,
  );
  await redemptionVault.freeFromMinAmount(
    mBasisRedemptionVaultWithSwapper.address,
    true,
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

  const roles = await getAllRoles(accessControl);

  const offChainUsdToken = constants.AddressZero;

  // role granting main
  // await initGrantRoles({
  //   accessControl,
  //   depositVault,
  //   owner,
  //   redemptionVault,
  //   mTBILL,
  // });

  // role granting testers
  await accessControl.grantRole(
    roles.blacklistedOperator,
    blackListableTester.address,
  );
  await accessControl.grantRole(
    roles.greenlistedOperator,
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
    eUSdRedemptionVault,
    mTBILL,
    eUsdOwner,
    mBASIS,
    eUSD,
    mBTC,
    accessControl,
    wAccessControlTester,
    roles: { ...roles, greenlistToggler },
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
    mBasisRedemptionVaultWithSwapper,
    mBASISToUsdDataFeed,
    mockedAggregatorMBASIS,
    liquidityProvider,
    mBtcDepositVault,
    mBtcRedemptionVault,
    mockedAggregatorMBTC,
    mBTCToBtcDataFeed,
    otherCoins,
    WBTCToBtcDataFeed,
    mEDGE,
  };
};
