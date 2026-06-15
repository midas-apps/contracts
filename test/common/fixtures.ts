import { Options } from '@layerzerolabs/lz-v2-utilities';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { NO_DELAY } from './ac.helpers';
import { approve, approveBase18, keccak256, mintToken } from './common.helpers';
import { deployProxyContract } from './deploy.helpers';
import {
  addPaymentTokenTest,
  setInstantFeeTest,
  setMinAmountTest,
  setWaivedFeeAccountTest,
} from './manageable-vault.helpers';
import {
  initializeDv,
  initializeDvWithAave,
  initializeDvWithMToken,
  initializeDvWithMorpho,
  initializeDvWithUstb,
  initializeMv,
  initializeRv,
  initializeRvWithAave,
  initializeRvWithMToken,
  initializeRvWithMorpho,
  initializeRvWithUstb,
} from './vault-initializer.helpers';

export {
  getInitializerParamsDv,
  getInitializerParamsDvWithMToken,
  getInitializerParamsDvWithUstb,
  getInitializerParamsMv,
  getInitializerParamsRv,
  getInitializerParamsRvWithMToken,
  getInitializerParamsRvWithUstb,
} from './vault-initializer.helpers';
export type {
  InitializerParamsDv,
  InitializerParamsDvWithMToken,
  InitializerParamsDvWithUstb,
  InitializerParamsMv,
  InitializerParamsRv,
  InitializerParamsRvWithMToken,
  InitializerParamsRvWithUstb,
} from './vault-initializer.helpers';

import { mTokensMetadata } from '../../helpers/mtokens-metadata';
import { getAllRoles, getRolesForToken } from '../../helpers/roles';
import {
  AggregatorV3Mock__factory,
  BlacklistableTester__factory,
  ERC20Mock__factory,
  GreenlistableTester__factory,
  MidasAccessControlTest__factory,
  PausableTester__factory,
  WithMidasAccessControlTester__factory,
  DataFeedTest__factory,
  AggregatorV3DeprecatedMock__factory,
  AggregatorV3UnhealthyMock__factory,
  CustomAggregatorV3CompatibleFeedTester__factory,
  SanctionsListMock__factory,
  WithSanctionsListTester__factory,
  USTBRedemptionMock__factory,
  AaveV3PoolMock__factory,
  MorphoVaultMock__factory,
  CustomAggregatorV3CompatibleFeedAdjustedTester__factory,
  USTBMock__factory,
  CustomAggregatorV3CompatibleFeedGrowthTester__factory,
  AcreAdapter__factory,
  CompositeDataFeedTest__factory,
  MidasLzMintBurnOFTAdapter__factory,
  MidasLzOFT__factory,
  MidasLzOFTAdapter__factory,
  MidasLzVaultComposerSyncTester,
  MTokenPermissionedTest__factory,
  AxelarInterchainTokenServiceMock__factory,
  MidasAxelarVaultExecutableTester,
  LzEndpointV2Mock__factory,
  MTokenTest__factory,
  RedemptionVaultTest,
  MidasTimelockManagerTest__factory,
  MidasAccessControlTimelockControllerTest__factory,
  MidasPauseManagerTest__factory,
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [
    owner,
    customRecipient,
    tokensReceiver,
    requestRedeemer,
    liquidityProvider,
    loanLp,
    loanRepaymentAddress,
    clawbackReceiver,
    councilMember1,
    councilMember2,
    councilMember3,
    councilMember4,
    councilMember5,
    ...regularAccounts
  ] = await ethers.getSigners();

  const councilMembers = [
    councilMember1,
    councilMember2,
    councilMember3,
    councilMember4,
    councilMember5,
  ];

  const allRoles = getAllRoles();

  // main contracts
  const accessControl = await new MidasAccessControlTest__factory(
    owner,
  ).deploy();
  await accessControl.initialize(0, []);

  const timelockManager = await new MidasTimelockManagerTest__factory(
    owner,
  ).deploy();

  await timelockManager.initialize(
    accessControl.address,
    100,
    councilMembers.map((v) => v.address),
  );

  const timelock = await new MidasAccessControlTimelockControllerTest__factory(
    owner,
  ).deploy();
  await timelock.initialize(timelockManager.address);

  const pauseManager = await new MidasPauseManagerTest__factory(owner).deploy();
  await pauseManager.initialize(accessControl.address, NO_DELAY, 86400);

  await accessControl.initializeRelationships(
    timelockManager.address,
    pauseManager.address,
  );
  await timelockManager.initializeTimelock(timelock.address);

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

  const mTBILL = await new MTokenTest__factory(owner).deploy(
    allRoles.tokenRoles.mTBILL.tokenManager,
    allRoles.tokenRoles.mTBILL.minter,
    allRoles.tokenRoles.mTBILL.burner,
  );

  await mTBILL.initialize(
    accessControl.address,
    clawbackReceiver.address,
    mTokensMetadata.mTBILL.name,
    mTokensMetadata.mTBILL.symbol,
  );

  const mTokenLoan = await new MTokenTest__factory(owner).deploy(
    keccak256('M_TOKEN_MANAGER_ROLE'),
    keccak256('M_TOKEN_TEST_MINT_OPERATOR_ROLE'),
    keccak256('M_TOKEN_TEST_BURN_OPERATOR_ROLE'),
  );

  await mTokenLoan.initialize(
    accessControl.address,
    clawbackReceiver.address,
    'mTokenLoan',
    'mTokenLoan',
  );

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

  await accessControl.grantRoleMult(
    rolesFlat.map((role) => ({ role, account: owner.address, delay: 0 })),
  );

  const mockedAggregator = await new AggregatorV3Mock__factory(owner).deploy();
  const mockedAggregatorDecimals = await mockedAggregator.decimals();

  const mockedAggregatorMToken = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();

  const mockedAggregatorMTokenLoan = await new AggregatorV3Mock__factory(
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

  await mockedAggregatorMTokenLoan.setRoundData(
    parseUnits('1', await mockedAggregatorMTokenLoan.decimals()),
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

  const mTokenLoanToUsdDataFeed = await new DataFeedTest__factory(
    owner,
  ).deploy();
  await mTokenLoanToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMTokenLoan.address,
    3 * 24 * 3600,
    parseUnits('0.1', await mockedAggregatorMTokenLoan.decimals()),
    parseUnits('10000', await mockedAggregatorMTokenLoan.decimals()),
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

  const commonVaultParams = {
    accessControl,
    mockedSanctionsList,
    mTBILL,
    mTokenToUsdDataFeed,
    tokensReceiver,
  };

  const depositVault = await initializeDv(commonVaultParams, undefined, {
    from: owner,
  });

  await accessControl['grantRole(bytes32,address)'](
    mTBILL.minterRole(),
    depositVault.address,
  );

  const redemptionVaultLoanSwapper = await initializeRv(
    {
      accessControl,
      mockedSanctionsList,
      mTBILL: mTokenLoan,
      mTokenToUsdDataFeed: mTokenLoanToUsdDataFeed,
      tokensReceiver,
      requestRedeemer,
    },
    undefined,
    { from: owner },
  );

  const redemptionVault = await initializeRv(
    {
      ...commonVaultParams,
      requestRedeemer,
      loanLp,
      loanRepaymentAddress,
      redemptionVaultLoanSwapper,
    },
    undefined,
    { from: owner },
  );

  await accessControl['grantRole(bytes32,address)'](
    mTokenLoan.burnerRole(),
    redemptionVaultLoanSwapper.address,
  );

  await accessControl['grantRole(bytes32,address)'](
    mTokenLoan.minterRole(),
    owner.address,
  );

  await redemptionVaultLoanSwapper.setWaivedFeeAccount(
    redemptionVault.address,
    true,
  );

  await accessControl['grantRole(bytes32,address)'](
    mTBILL.burnerRole(),
    redemptionVault.address,
  );

  const manageableVault = await initializeMv(commonVaultParams, undefined, {
    from: owner,
  });

  const stableCoins = {
    usdc: await new ERC20Mock__factory(owner).deploy(8),
    usdt: await new ERC20Mock__factory(owner).deploy(18),
    dai: await new ERC20Mock__factory(owner).deploy(9),
    usdc6: await new ERC20Mock__factory(owner).deploy(6),
  };

  const otherCoins = {
    wbtc: await new ERC20Mock__factory(owner).deploy(8),
  };

  const ustbToken = await new USTBMock__factory(owner).deploy();

  /* Deposit Vault With USTB */

  const depositVaultWithUSTB = await initializeDvWithUstb(
    {
      ...commonVaultParams,
      ustbToken,
    },
    undefined,
    { from: owner },
  );

  await accessControl['grantRole(bytes32,address)'](
    mTBILL.minterRole(),
    depositVaultWithUSTB.address,
  );

  /* Redemption Vault With USTB */

  const ustbRedemption = await new USTBRedemptionMock__factory(owner).deploy(
    ustbToken.address,
    stableCoins.usdc.address,
  );
  await stableCoins.usdc.mint(ustbRedemption.address, parseUnits('1000000'));

  const redemptionVaultWithUSTB = await initializeRvWithUstb(
    {
      ...commonVaultParams,
      requestRedeemer,
      loanLp,
      loanRepaymentAddress,
      redemptionVaultLoanSwapper,
      ustbRedemption,
    },
    undefined,
    { from: owner },
  );
  await accessControl['grantRole(bytes32,address)'](
    mTBILL.burnerRole(),
    redemptionVaultWithUSTB.address,
  );
  await redemptionVaultLoanSwapper.setWaivedFeeAccount(
    redemptionVaultWithUSTB.address,
    true,
  );

  /* Redemption Vault With Aave */

  const aUSDC = await new ERC20Mock__factory(owner).deploy(8); // aToken mock, same decimals as USDC
  const aavePoolMock = await new AaveV3PoolMock__factory(owner).deploy();
  await aavePoolMock.setReserveAToken(stableCoins.usdc.address, aUSDC.address);
  await stableCoins.usdc.mint(aavePoolMock.address, parseUnits('1000000'));

  const redemptionVaultWithAave = await initializeRvWithAave(
    {
      ...commonVaultParams,
      requestRedeemer,
      loanLp,
      loanRepaymentAddress,
      redemptionVaultLoanSwapper,
    },
    undefined,
    { from: owner },
  );
  await redemptionVaultWithAave.setAavePool(
    stableCoins.usdc.address,
    aavePoolMock.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    mTBILL.burnerRole(),
    redemptionVaultWithAave.address,
  );
  await redemptionVaultLoanSwapper.setWaivedFeeAccount(
    redemptionVaultWithAave.address,
    true,
  );
  /* Redemption Vault With Morpho */

  const morphoVaultMock = await new MorphoVaultMock__factory(owner).deploy(
    stableCoins.usdc.address,
  );
  await stableCoins.usdc.mint(morphoVaultMock.address, parseUnits('1000000'));

  const redemptionVaultWithMorpho = await initializeRvWithMorpho(
    {
      ...commonVaultParams,
      requestRedeemer,
      loanLp,
      loanRepaymentAddress,
      redemptionVaultLoanSwapper,
    },
    undefined,
    { from: owner },
  );
  await redemptionVaultWithMorpho.setMorphoVault(
    stableCoins.usdc.address,
    morphoVaultMock.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    mTBILL.burnerRole(),
    redemptionVaultWithMorpho.address,
  );
  await redemptionVaultLoanSwapper.setWaivedFeeAccount(
    redemptionVaultWithMorpho.address,
    true,
  );
  /* Deposit Vault With Aave */

  const depositVaultWithAave = await initializeDvWithAave(
    commonVaultParams,
    undefined,
    { from: owner },
  );
  await depositVaultWithAave.setAavePool(
    stableCoins.usdc.address,
    aavePoolMock.address,
  );

  await accessControl['grantRole(bytes32,address)'](
    mTBILL.minterRole(),
    depositVaultWithAave.address,
  );

  /* Deposit Vault With Morpho */

  const depositVaultWithMorpho = await initializeDvWithMorpho(
    commonVaultParams,
    undefined,
    { from: owner },
  );

  await accessControl['grantRole(bytes32,address)'](
    mTBILL.minterRole(),
    depositVaultWithMorpho.address,
  );

  /* Deposit Vault With MToken (deposits into mTBILL DV) */

  const depositVaultWithMToken = await initializeDvWithMToken(
    {
      ...commonVaultParams,
      depositVault,
    },
    undefined,
    { from: owner },
  );

  await accessControl['grantRole(bytes32,address)'](
    mTBILL.minterRole(),
    depositVaultWithMToken.address,
  );

  await depositVault.setWaivedFeeAccount(depositVaultWithMToken.address, true);

  /* Redemption Vault With MToken (mFONE -> mTBILL) */

  const mockedAggregatorMFone = await new AggregatorV3Mock__factory(
    owner,
  ).deploy();
  await mockedAggregatorMFone.setRoundData(
    parseUnits('2', mockedAggregatorDecimals),
  );
  const mFoneToUsdDataFeed = await new DataFeedTest__factory(owner).deploy();
  await mFoneToUsdDataFeed.initialize(
    accessControl.address,
    mockedAggregatorMFone.address,
    3 * 24 * 3600,
    parseUnits('0.1', mockedAggregatorDecimals),
    parseUnits('10000', mockedAggregatorDecimals),
  );

  const redemptionVaultWithMToken = await initializeRvWithMToken(
    {
      ...commonVaultParams,
      requestRedeemer,
      loanLp,
      loanRepaymentAddress,
      redemptionVaultLoanSwapper,
      redemptionVault: redemptionVaultLoanSwapper.address,
    },
    undefined,
    { from: owner },
  );

  await redemptionVaultLoanSwapper.setWaivedFeeAccount(
    redemptionVaultWithMToken.address,
    true,
  );
  await accessControl['grantRole(bytes32,address)'](
    mTBILL.burnerRole(),
    redemptionVaultWithMToken.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    mTokenLoan.burnerRole(),
    redemptionVaultWithMToken.address,
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

  const customFeedAdjusted =
    await new CustomAggregatorV3CompatibleFeedAdjustedTester__factory(
      owner,
    ).deploy(customFeed.address, parseUnits('10', 8));

  // role granting testers
  await accessControl['grantRole(bytes32,address)'](
    await customFeed.contractAdminRole(),
    owner.address,
  );

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
  await accessControl['grantRole(bytes32,address)'](
    allRoles.common.blacklistedOperator,
    blackListableTester.address,
  );
  await accessControl['grantRole(bytes32,address)'](
    allRoles.common.greenlistedOperator,
    greenListableTester.address,
  );
  const greenlistAdmin = await greenListableTester.greenlistAdminRole();
  await accessControl['grantRole(bytes32,address)'](
    greenlistAdmin,
    owner.address,
  );

  const deployDeprecatedFeed = async () => {
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

    return {
      dataFeedDeprecated,
      mockedDeprecatedAggregator,
      mockedDeprecatedAggregatorDecimals,
    };
  };

  const deployUnhealthyFeed = async () => {
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
      dataFeedUnhealthy,
      mockedUnhealthyAggregator,
      mockedUnhealthyAggregatorDecimals,
    };
  };

  return {
    customFeed,
    customFeedAdjusted,
    customFeedGrowth,
    mTBILL,
    mBasisToUsdDataFeed,
    accessControl,
    wAccessControlTester,
    roles: { ...allRoles, greenlistAdmin },
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
    mTokenToUsdDataFeed,
    mockedAggregatorMToken,
    mockedAggregatorMBasis,
    offChainUsdToken,
    mockedAggregatorMTokenDecimals,
    tokensReceiver,
    withSanctionsListTester,
    mockedSanctionsList,
    requestRedeemer,
    redemptionVaultWithUSTB,
    redemptionVaultWithAave,
    aavePoolMock,
    aUSDC,
    redemptionVaultWithMorpho,
    morphoVaultMock,
    liquidityProvider,
    mockedAggregatorMFone,
    mFoneToUsdDataFeed,
    redemptionVaultWithMToken,
    otherCoins,
    ustbToken,
    ustbRedemption,
    customRecipient,
    depositVaultWithUSTB,
    depositVaultWithAave,
    depositVaultWithMorpho,
    depositVaultWithMToken,
    dataFeedGrowth,
    compositeDataFeed,
    loanLp,
    loanRepaymentAddress,
    redemptionVaultLoanSwapper,
    mTokenLoan,
    mTokenLoanToUsdDataFeed,
    mockedAggregatorMTokenLoan,
    timelock,
    timelockManager,
    pauseManager,
    councilMembers,
    clawbackReceiver,
    manageableVault,
    deployDeprecatedFeed,
    deployUnhealthyFeed,
  };
};

export type DefaultFixture = Omit<
  Awaited<ReturnType<typeof defaultDeploy>>,
  'redemptionVault'
> & {
  redemptionVault: RedemptionVaultTest;
};

/**
 * mTokenPermissionedTest + dedicated deposit/redemption vaults (for integration-style tests).
 */
export const mTokenPermissionedFixture = async (
  baseFixture?: Awaited<ReturnType<typeof defaultDeploy>>,
) => {
  const fx = baseFixture ?? (await defaultDeploy());
  const {
    owner,
    accessControl,
    mockedSanctionsList,
    tokensReceiver,
    requestRedeemer,
    mTokenToUsdDataFeed,
  } = fx;

  const mTokenPermissioned = await new MTokenPermissionedTest__factory(
    owner,
  ).deploy();
  await mTokenPermissioned.initialize(
    accessControl.address,
    fx.clawbackReceiver.address,
    'mTokenPermissioned',
    'mTokenPermissioned',
  );

  const mintRole = await mTokenPermissioned.minterRole();
  const burnRole = await mTokenPermissioned.burnerRole();
  const tokenManagerRole = await mTokenPermissioned.contractAdminRole();
  const mTokenPermissionedGreenlistedRole =
    await mTokenPermissioned.greenlistedRole();

  await accessControl['grantRole(bytes32,address)'](mintRole, owner.address);
  await accessControl['grantRole(bytes32,address)'](burnRole, owner.address);
  await accessControl['grantRole(bytes32,address)'](
    tokenManagerRole,
    owner.address,
  );

  const mTokenPermissionedDepositVault = await initializeDv(
    {
      accessControl,
      mockedSanctionsList,
      mTBILL: mTokenPermissioned,
      mTokenToUsdDataFeed,
      tokensReceiver,
    },
    undefined,
    { from: owner },
  );
  await accessControl['grantRole(bytes32,address)'](
    mintRole,
    mTokenPermissionedDepositVault.address,
  );

  const mTokenPermissionedRedemptionVault = await initializeRv(
    {
      accessControl,
      mockedSanctionsList,
      mTBILL: mTokenPermissioned,
      mTokenToUsdDataFeed,
      tokensReceiver,
      requestRedeemer,
    },
    undefined,
    { from: owner },
  );

  await mTokenPermissionedRedemptionVault.setMaxApproveRequestId(100);

  await accessControl['grantRole(bytes32,address)'](
    burnRole,
    mTokenPermissionedRedemptionVault.address,
  );

  return {
    ...fx,
    mTokenPermissioned,
    mTokenPermissionedRoles: {
      mint: mintRole,
      burn: burnRole,
      manager: tokenManagerRole,
      greenlisted: mTokenPermissionedGreenlistedRole,
    },
    mTokenPermissionedDepositVault,
    mTokenPermissionedRedemptionVault,
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

  await setWaivedFeeAccountTest(
    { vault: defaultFixture.redemptionVault, owner: defaultFixture.owner },
    acreUsdcMTbillAdapter.address,
    true,
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

  await accessControl.grantRoleMult([
    { role: roles.minter, account: oftAdapterA.address, delay: 0 },
    { role: roles.burner, account: oftAdapterA.address, delay: 0 },
    { role: roles.minter, account: oftAdapterB.address, delay: 0 },
    { role: roles.burner, account: oftAdapterB.address, delay: 0 },
  ]);

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

  await accessControl.grantRoleMult([
    { role: roles.minter, account: axelarItsA.address, delay: 0 },
    { role: roles.burner, account: axelarItsA.address, delay: 0 },
    { role: roles.minter, account: axelarItsB.address, delay: 0 },
    { role: roles.burner, account: axelarItsB.address, delay: 0 },
  ]);

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
