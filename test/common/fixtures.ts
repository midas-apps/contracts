import { Options } from '@layerzerolabs/lz-v2-utilities';
import { setBalance } from '@nomicfoundation/hardhat-network-helpers';
import { increase } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { constants, ContractTransaction, PopulatedTransaction } from 'ethers';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import * as hre from 'hardhat';

import { approve, approveBase18, mintToken } from './common.helpers';
import { deployProxyContract } from './deploy.helpers';
import {
  addPaymentTokenTest,
  addWaivedFeeAccountTest,
  setInstantFeeTest,
  setMinAmountTest,
} from './manageable-vault.helpers';
import { postDeploymentTest } from './post-deploy.helpers';

import { getAllRoles, getRolesForToken } from '../../helpers/roles';
import {
  AggregatorV3Mock__factory,
  BlacklistableTester__factory,
  DepositVaultTest__factory,
  ERC20Mock__factory,
  GreenlistableTester__factory,
  MidasAccessControlTest__factory,
  PausableTester__factory,
  RedemptionVaultTest__factory,
  MTBILLTest__factory,
  WithMidasAccessControlTester__factory,
  DataFeedTest__factory,
  AggregatorV3DeprecatedMock__factory,
  AggregatorV3UnhealthyMock__factory,
  CustomAggregatorV3CompatibleFeedTester__factory,
  SanctionsListMock__factory,
  WithSanctionsListTester__factory,
  RedemptionTest__factory,
  USTBRedemptionMock__factory,
  RedemptionVaultWithBUIDLTest__factory,
  RedemptionVaultWithUSTBTest__factory,
  RedemptionVaultWithSwapperTest__factory,
  CustomAggregatorV3CompatibleFeedDiscountedTester__factory,
  DepositVaultWithUSTBTest__factory,
  USTBMock__factory,
  CustomAggregatorV3CompatibleFeedGrowthTester__factory,
  AcreAdapter__factory,
  CompositeDataFeedTest__factory,
  MidasLzMintBurnOFTAdapter__factory,
  MidasLzOFT__factory,
  MidasLzOFTAdapter__factory,
  MidasLzVaultComposerSyncTester,
  AxelarInterchainTokenServiceMock__factory,
  MidasAxelarVaultExecutableTester,
  LzEndpointV2Mock__factory,
  GnosisSafe,
  TokensWithdrawModule__factory,
  Integrity__factory,
  Packer__factory,
  Delay__factory,
  Delay,
  EnforceDelayModifierGuard__factory,
  ERC721Mock__factory,
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

  const compositeDataFeed = await new CompositeDataFeedTest__factory(
    owner,
  ).deploy();

  await compositeDataFeed.initialize(
    accessControl.address,
    mTokenToUsdDataFeed.address,
    mBasisToUsdDataFeed.address,
    parseUnits('0.1'),
    parseUnits('10000'),
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
    constants.MaxUint256,
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
    'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,uint256,address)'
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
    constants.MaxUint256,
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

  const customFeedGrowth =
    await new CustomAggregatorV3CompatibleFeedGrowthTester__factory(
      owner,
    ).deploy();

  await customFeedGrowth.initialize(
    accessControl.address,
    2,
    parseUnits('10000', 8),
    parseUnits('1', 8),
    parseUnits('0', 8),
    parseUnits('100', 8),
    false,
    'Custom Data Feed Growth',
  );

  const dataFeedGrowth = await new DataFeedTest__factory(owner).deploy();
  await dataFeedGrowth.initialize(
    accessControl.address,
    customFeedGrowth.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorDecimals),
    parseUnits('10000', mockedAggregatorDecimals),
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
  const greenlistToggler = await greenListableTester.greenlistTogglerRole();
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
    customFeedGrowth,
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
    dataFeedGrowth,
    compositeDataFeed,
  };
};

export const acreAdapterFixture = async () => {
  const defaultFixture = await defaultDeploy();

  const acreUsdcMTbillAdapter = await new AcreAdapter__factory(
    defaultFixture.owner,
  ).deploy(
    defaultFixture.depositVault.address,
    defaultFixture.redemptionVault.address,
    defaultFixture.stableCoins.usdc.address,
  );

  // prepare vaults for tests
  await setMinAmountTest(
    { vault: defaultFixture.depositVault, owner: defaultFixture.owner },
    0,
  );
  await setInstantFeeTest(
    { vault: defaultFixture.depositVault, owner: defaultFixture.owner },
    0,
  );

  await setMinAmountTest(
    { vault: defaultFixture.redemptionVault, owner: defaultFixture.owner },
    0,
  );
  await setInstantFeeTest(
    { vault: defaultFixture.redemptionVault, owner: defaultFixture.owner },
    0,
  );

  await addWaivedFeeAccountTest(
    { vault: defaultFixture.redemptionVault, owner: defaultFixture.owner },
    acreUsdcMTbillAdapter.address,
  );

  await addPaymentTokenTest(
    { vault: defaultFixture.depositVault, owner: defaultFixture.owner },
    defaultFixture.stableCoins.usdc,
    defaultFixture.dataFeed.address,
    0,
    true,
  );

  await addPaymentTokenTest(
    { vault: defaultFixture.redemptionVault, owner: defaultFixture.owner },
    defaultFixture.stableCoins.usdc,
    defaultFixture.dataFeed.address,
    0,
    true,
  );

  // prepare caller for tests
  await approve(
    defaultFixture.regularAccounts[0],
    defaultFixture.stableCoins.usdc,
    acreUsdcMTbillAdapter.address,
    parseUnits('100', 8),
  );

  await mintToken(
    defaultFixture.stableCoins.usdc,
    defaultFixture.regularAccounts[0],
    100,
  );

  await mintToken(
    defaultFixture.stableCoins.usdc,
    defaultFixture.redemptionVault,
    100,
  );

  await approveBase18(
    defaultFixture.regularAccounts[0],
    defaultFixture.mTBILL,
    acreUsdcMTbillAdapter.address,
    20,
  );

  await mintToken(defaultFixture.mTBILL, defaultFixture.regularAccounts[0], 20);

  return { acreUsdcMTbillAdapter, ...defaultFixture };
};

export const layerZeroFixture = async () => {
  const defaultFixture = await defaultDeploy();

  const {
    owner,
    accessControl,
    mTBILL,
    depositVault,
    redemptionVault,
    stableCoins,
  } = defaultFixture;
  const eidA = 30001;
  const eidB = 30002;

  // await setBlockGasLimit(100000000000);

  const mockEndpointA = await new LzEndpointV2Mock__factory(owner).deploy(eidA);
  const mockEndpointB = await new LzEndpointV2Mock__factory(owner).deploy(eidB);

  const roles = getRolesForToken('mTBILL');

  const oftAdapterA = await new MidasLzMintBurnOFTAdapter__factory(
    owner,
  ).deploy(mTBILL.address, mockEndpointA.address, owner.address, [
    {
      dstEid: eidB,
      limit: parseUnits('1000000000', 18),
      window: 60,
    },
  ]);

  const oftAdapterB = await new MidasLzMintBurnOFTAdapter__factory(
    owner,
  ).deploy(mTBILL.address, mockEndpointB.address, owner.address, [
    {
      dstEid: eidA,
      limit: parseUnits('1000000000', 18),
      window: 60,
    },
  ]);

  await accessControl.grantRoleMult(
    [roles.minter, roles.burner, roles.minter, roles.burner],
    [
      oftAdapterA.address,
      oftAdapterA.address,
      oftAdapterB.address,
      oftAdapterB.address,
    ],
  );

  await mockEndpointA.setDestLzEndpoint(
    oftAdapterB.address,
    mockEndpointB.address,
  );
  await mockEndpointB.setDestLzEndpoint(
    oftAdapterA.address,
    mockEndpointA.address,
  );

  await oftAdapterA.setEnforcedOptions([
    {
      eid: eidB,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .toHex(),
      msgType: 1,
    },
    {
      eid: eidB,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .addExecutorComposeOption(0, 600_000, 0)
        .toHex(),
      msgType: 2,
    },
  ]);
  await oftAdapterB.setEnforcedOptions([
    {
      eid: eidA,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .toHex(),
      msgType: 1,
    },
    {
      eid: eidA,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .addExecutorComposeOption(0, 600_000, 0)
        .toHex(),
      msgType: 2,
    },
  ]);

  await oftAdapterA
    .connect(owner)
    .setPeer(eidB, ethers.utils.zeroPad(oftAdapterB.address, 32));
  await oftAdapterB
    .connect(owner)
    .setPeer(eidA, ethers.utils.zeroPad(oftAdapterA.address, 32));

  const pTokenLzOft = await new MidasLzOFT__factory(owner).deploy(
    'LZ Payment Token OFT',
    'PTOFT',
    9,
    mockEndpointB.address,
    owner.address,
  );

  const pTokenLzOftAdapter = await new MidasLzOFTAdapter__factory(owner).deploy(
    stableCoins.usdt.address,
    9,
    mockEndpointA.address,
    owner.address,
  );

  await mockEndpointA.setDestLzEndpoint(
    pTokenLzOft.address,
    mockEndpointB.address,
  );
  await mockEndpointB.setDestLzEndpoint(
    pTokenLzOftAdapter.address,
    mockEndpointA.address,
  );

  await pTokenLzOftAdapter.setEnforcedOptions([
    {
      eid: eidB,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .toHex(),
      msgType: 1,
    },
    {
      eid: eidB,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .toHex(),
      msgType: 2,
    },
  ]);
  await pTokenLzOft.setEnforcedOptions([
    {
      eid: eidA,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .toHex(),
      msgType: 1,
    },
    {
      eid: eidA,
      options: Options.newOptions()
        .addExecutorLzReceiveOption(200_000, 0)
        .toHex(),
      msgType: 2,
    },
  ]);

  await pTokenLzOftAdapter
    .connect(owner)
    .setPeer(eidB, ethers.utils.zeroPad(pTokenLzOft.address, 32));
  await pTokenLzOft
    .connect(owner)
    .setPeer(eidA, ethers.utils.zeroPad(pTokenLzOftAdapter.address, 32));

  const composer = await deployProxyContract<MidasLzVaultComposerSyncTester>(
    'MidasLzVaultComposerSyncTester',
    undefined,
    undefined,
    [
      depositVault.address,
      redemptionVault.address,
      pTokenLzOftAdapter.address,
      oftAdapterA.address,
    ],
  );
  return {
    mockEndpointA,
    mockEndpointB,
    oftAdapterA,
    oftAdapterB,
    eidA,
    eidB,
    pTokenLzOft,
    pTokenLzOftAdapter,
    composer,
    ...defaultFixture,
  };
};

export const axelarFixture = async () => {
  const defaultFixture = await defaultDeploy();

  const {
    owner,
    accessControl,
    mTBILL,
    depositVault,
    redemptionVault,
    stableCoins,
  } = defaultFixture;
  const chainNameA = 'ChainA';
  const chainNameB = 'ChainB';

  const chainNameHashA = ethers.utils.solidityKeccak256(
    ['string'],
    [chainNameA],
  );

  const chainNameHashB = ethers.utils.solidityKeccak256(
    ['string'],
    [chainNameB],
  );

  const axelarItsA = await new AxelarInterchainTokenServiceMock__factory(
    owner,
  ).deploy();

  const axelarItsB = await new AxelarInterchainTokenServiceMock__factory(
    owner,
  ).deploy();

  await axelarItsA.setChainNameHash(chainNameHashA);
  await axelarItsB.setChainNameHash(chainNameHashB);

  const mTokenId = ethers.utils.solidityKeccak256(['string'], ['mTOKEN']);
  const paymentTokenId = ethers.utils.solidityKeccak256(['string'], ['pTOKEN']);

  await axelarItsA.registerToken(mTokenId, mTBILL.address, true);
  await axelarItsB.registerToken(mTokenId, mTBILL.address, true);

  await axelarItsA.registerToken(
    paymentTokenId,
    stableCoins.usdt.address,
    false,
  );
  await axelarItsB.registerToken(
    paymentTokenId,
    stableCoins.usdt.address,
    false,
  );

  const roles = getRolesForToken('mTBILL');

  await accessControl.grantRoleMult(
    [roles.minter, roles.burner, roles.minter, roles.burner],
    [
      axelarItsA.address,
      axelarItsA.address,
      axelarItsB.address,
      axelarItsB.address,
    ],
  );

  const executor = await deployProxyContract<MidasAxelarVaultExecutableTester>(
    'MidasAxelarVaultExecutableTester',
    undefined,
    undefined,
    [
      depositVault.address,
      redemptionVault.address,
      paymentTokenId,
      mTokenId,
      axelarItsA.address,
    ],
  );

  return {
    axelarItsA,
    axelarItsB,
    executor,
    chainNameHashA,
    chainNameHashB,
    mTokenId,
    paymentTokenId,
    chainNameA,
    chainNameB,
    ...defaultFixture,
  };
};

type PopulatedTxWithGas = PopulatedTransaction & { gas?: number };

export const safeFixture = async () => {
  const [
    deployer,
    signer1,
    signer2,
    signer3,
    tokensReceiver,
    tokensWithdrawer,
    ...regularAccounts
  ] = await ethers.getSigners();

  const testERC20 = await new ERC20Mock__factory(deployer).deploy(18);
  const test2ERC20 = await new ERC20Mock__factory(deployer).deploy(18);

  const testERC721 = await new ERC721Mock__factory(deployer).deploy();
  const test2ERC721 = await new ERC721Mock__factory(deployer).deploy();

  const safeSingleSigner = await deployProxyContract<GnosisSafe>(
    'GnosisSafe',
    [
      [signer1.address],
      1,
      constants.AddressZero,
      '0x',
      constants.AddressZero,
      constants.AddressZero,
      0,
      constants.AddressZero,
    ],
    'setup',
  );

  const safeMultiSigner = await deployProxyContract<GnosisSafe>(
    'GnosisSafe',
    [
      [signer1.address, signer2.address, signer3.address],
      2,
      constants.AddressZero,
      '0x',
      constants.AddressZero,
      constants.AddressZero,
      0,
      constants.AddressZero,
    ],
    'setup',
  );

  const sendSafeTx = async (
    safe: GnosisSafe,
    delayModule: Delay,
    signers: SignerWithAddress[],
    populatedTx: PopulatedTxWithGas,
    waitAndSend = false,
  ) => {
    let tx: Promise<ContractTransaction>;
    if (signers.length === 1) {
      tx = safe
        .connect(signers[0])
        .execTransaction(
          populatedTx.to ?? '0x',
          populatedTx.value ?? 0,
          populatedTx.data ?? '0x',
          0,
          populatedTx.gas ?? 0,
          0,
          0,
          constants.AddressZero,
          constants.AddressZero,
          hre.ethers.utils.defaultAbiCoder.encode(
            ['address'],
            [signers[0].address],
          ) +
            '000000000000000000000000000000000000000000000000000000000000000001',
        );
    } else {
      throw new Error('Not implemented');
    }

    if (waitAndSend) {
      await expect(tx).not.reverted;

      await increase(3600);

      const decodedData = delayModule.interface.decodeFunctionData(
        'execTransactionFromModule',
        populatedTx.data ?? '0x',
      );

      return delayModule.executeNextTx(
        decodedData[0],
        decodedData[1],
        decodedData[2],
        0,
      );
    } else {
      return tx;
    }
  };

  const sendSafeTxSingleSigner = async (
    populateTx: (
      safe: GnosisSafe,
    ) => PopulatedTxWithGas | Promise<PopulatedTxWithGas>,
    waitAndSend = false,
  ) => {
    return sendSafeTx(
      safeSingleSigner,
      delayModuleSafeSingle,
      [signer1],
      await populateTx(safeSingleSigner),
      waitAndSend,
    );
  };

  const sendSafeTxMultiSigner = async (
    populateTx: (
      safe: GnosisSafe,
    ) => PopulatedTxWithGas | Promise<PopulatedTxWithGas>,
    waitAndSend = false,
  ) => {
    return sendSafeTx(
      safeMultiSigner,
      delayModuleSafeMulti,
      [signer1, signer2, signer3],
      await populateTx(safeMultiSigner),
      waitAndSend,
    );
  };

  const lib = {
    '@gnosis-guild/zodiac-modules/contracts/roles/packers/Packer.sol:Packer': (
      await new Packer__factory(deployer).deploy()
    ).address,
    '@gnosis-guild/zodiac-modules/contracts/roles/Integrity.sol:Integrity': (
      await new Integrity__factory(deployer).deploy()
    ).address,
  };

  const withdrawTokensModuleSafeSingle =
    await new TokensWithdrawModule__factory(deployer).deploy(
      tokensReceiver.address,
      tokensWithdrawer.address,
      safeSingleSigner.address,
      safeSingleSigner.address,
    );

  const withdrawTokensModuleSafeMulti = await new TokensWithdrawModule__factory(
    deployer,
  ).deploy(
    tokensReceiver.address,
    tokensWithdrawer.address,
    safeMultiSigner.address,
    safeMultiSigner.address,
  );

  const delayModuleSafeSingle = await new Delay__factory(deployer).deploy(
    safeSingleSigner.address,
    safeSingleSigner.address,
    safeSingleSigner.address,
    3600,
    3600,
  );

  const delayModuleSafeMulti = await new Delay__factory(deployer).deploy(
    safeMultiSigner.address,
    safeMultiSigner.address,
    safeMultiSigner.address,
    3600,
    3600,
  );

  const guardSafeSingle = await new EnforceDelayModifierGuard__factory(
    deployer,
  ).deploy(delayModuleSafeSingle.address);

  const guardSafeMulti = await new EnforceDelayModifierGuard__factory(
    deployer,
  ).deploy(delayModuleSafeMulti.address);

  // enable delay modules
  await sendSafeTxSingleSigner((safe) =>
    safe.populateTransaction.enableModule(delayModuleSafeSingle.address),
  );

  await sendSafeTxSingleSigner((safe) =>
    safe.populateTransaction.enableModule(
      withdrawTokensModuleSafeSingle.address,
    ),
  );

  await sendSafeTxSingleSigner(() =>
    delayModuleSafeSingle.populateTransaction.enableModule(
      safeSingleSigner.address,
    ),
  );

  // set safe guard
  await sendSafeTxSingleSigner((safe) =>
    safe.populateTransaction.setGuard(guardSafeSingle.address),
  );

  await setBalance(safeSingleSigner.address, parseEther('1'));
  await setBalance(safeMultiSigner.address, parseEther('1'));

  return {
    safeSingleSigner,
    safeMultiSigner,
    signer1,
    signer2,
    signer3,
    tokensReceiver,
    tokensWithdrawer,
    regularAccounts,
    deployer,
    sendSafeTxMultiSigner,
    sendSafeTxSingleSigner,
    withdrawTokensModuleSafeSingle,
    withdrawTokensModuleSafeMulti,
    delayModuleSafeSingle,
    delayModuleSafeMulti,
    guardSafeSingle,
    guardSafeMulti,
    testERC20,
    testERC721,
    test2ERC20,
    test2ERC721,
  };
};

export type SafeFixture = Awaited<ReturnType<typeof safeFixture>>;
