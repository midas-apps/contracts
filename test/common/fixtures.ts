import { Options } from '@layerzerolabs/lz-v2-utilities';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { expect } from 'chai';
import { constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
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
  USTBRedemptionMock__factory,
  RedemptionVaultWithUSTBTest__factory,
  RedemptionVaultWithAaveTest__factory,
  RedemptionVaultWithMorphoTest__factory,
  RedemptionVaultWithMTokenTest__factory,
  AaveV3PoolMock__factory,
  MorphoVaultMock__factory,
  CustomAggregatorV3CompatibleFeedAdjustedTester__factory,
  DepositVaultWithAaveTest__factory,
  DepositVaultWithMorphoTest__factory,
  DepositVaultWithMTokenTest__factory,
  DepositVaultWithUSTBTest__factory,
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
} from '../../typechain-types';

export const defaultDeploy = async () => {
  const [
    owner,
    customRecipient,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    liquidityProvider,
    loanLp,
    loanLpFeeReceiver,
    loanRepaymentAddress,
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

  const mTokenLoan = await new MTokenTest__factory(owner).deploy();
  await expect(mTokenLoan.initialize(ethers.constants.AddressZero)).to.be
    .reverted;
  await mTokenLoan.initialize(accessControl.address);

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

  const depositVault = await new DepositVaultTest__factory(owner).deploy();

  await depositVault.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: parseUnits('100'),
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      minInstantFee: 0,
      maxInstantFee: 10000,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      maxInstantShare: 100_00,
    },
    {
      minMTokenAmountForFirstDeposit: 0,
      maxSupplyCap: constants.MaxUint256,
    },
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_MINT_OPERATOR_ROLE(),
    depositVault.address,
  );

  const redemptionVault = await new RedemptionVaultTest__factory(
    owner,
  ).deploy();

  const redemptionVaultLoanSwapper = await new RedemptionVaultTest__factory(
    owner,
  ).deploy();

  await redemptionVault.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: loanLp.address,
      loanLpFeeReceiver: loanLpFeeReceiver.address,
      loanRepaymentAddress: loanRepaymentAddress.address,
      loanSwapperVault: redemptionVaultLoanSwapper.address,
      maxLoanApr: 0,
    },
  );

  await redemptionVaultLoanSwapper.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTokenLoan.address,
      mTokenDataFeed: mTokenLoanToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: constants.AddressZero,
      loanLpFeeReceiver: constants.AddressZero,
      loanRepaymentAddress: constants.AddressZero,
      loanSwapperVault: constants.AddressZero,
      maxLoanApr: 0,
    },
  );

  await accessControl.grantRole(
    mTokenLoan.M_TOKEN_TEST_BURN_OPERATOR_ROLE(),
    redemptionVaultLoanSwapper.address,
  );

  await accessControl.grantRole(
    mTokenLoan.M_TOKEN_TEST_MINT_OPERATOR_ROLE(),
    owner.address,
  );

  await redemptionVaultLoanSwapper.addWaivedFeeAccount(redemptionVault.address);

  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVault.address,
  );

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

  const depositVaultWithUSTB = await new DepositVaultWithUSTBTest__factory(
    owner,
  ).deploy();

  await depositVaultWithUSTB[
    'initialize((address,address,uint256,uint256,address,address,address,address,uint256,uint64,uint64,uint64,(uint256,uint256)[]),(uint256,uint256),address)'
  ](
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: parseUnits('100'),
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      minMTokenAmountForFirstDeposit: 0,
      maxSupplyCap: constants.MaxUint256,
    },
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
    'initialize((address,address,uint256,uint256,address,address,address,address,uint256,uint64,uint64,uint64,(uint256,uint256)[]),(address,address,address,address,address,uint64),address)'
  ](
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: loanLp.address,
      loanLpFeeReceiver: loanLpFeeReceiver.address,
      loanRepaymentAddress: loanRepaymentAddress.address,
      loanSwapperVault: redemptionVaultLoanSwapper.address,
      maxLoanApr: 0,
    },
    ustbRedemption.address,
  );
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithUSTB.address,
  );
  await redemptionVaultLoanSwapper.addWaivedFeeAccount(
    redemptionVaultWithUSTB.address,
  );

  /* Redemption Vault With Aave */

  const aUSDC = await new ERC20Mock__factory(owner).deploy(8); // aToken mock, same decimals as USDC
  const aavePoolMock = await new AaveV3PoolMock__factory(owner).deploy();
  await aavePoolMock.setReserveAToken(stableCoins.usdc.address, aUSDC.address);
  await stableCoins.usdc.mint(aavePoolMock.address, parseUnits('1000000'));

  const redemptionVaultWithAave =
    await new RedemptionVaultWithAaveTest__factory(owner).deploy();

  await redemptionVaultWithAave.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: loanLp.address,
      loanLpFeeReceiver: loanLpFeeReceiver.address,
      loanRepaymentAddress: loanRepaymentAddress.address,
      loanSwapperVault: redemptionVaultLoanSwapper.address,
      maxLoanApr: 0,
    },
  );
  await redemptionVaultWithAave.setAavePool(
    stableCoins.usdc.address,
    aavePoolMock.address,
  );
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithAave.address,
  );
  await redemptionVaultLoanSwapper.addWaivedFeeAccount(
    redemptionVaultWithAave.address,
  );
  /* Redemption Vault With Morpho */

  const morphoVaultMock = await new MorphoVaultMock__factory(owner).deploy(
    stableCoins.usdc.address,
  );
  await stableCoins.usdc.mint(morphoVaultMock.address, parseUnits('1000000'));

  const redemptionVaultWithMorpho =
    await new RedemptionVaultWithMorphoTest__factory(owner).deploy();

  await redemptionVaultWithMorpho.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: loanLp.address,
      loanLpFeeReceiver: loanLpFeeReceiver.address,
      loanRepaymentAddress: loanRepaymentAddress.address,
      loanSwapperVault: redemptionVaultLoanSwapper.address,
      maxLoanApr: 0,
    },
  );
  await redemptionVaultWithMorpho.setMorphoVault(
    stableCoins.usdc.address,
    morphoVaultMock.address,
  );
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithMorpho.address,
  );
  await redemptionVaultLoanSwapper.addWaivedFeeAccount(
    redemptionVaultWithMorpho.address,
  );
  /* Deposit Vault With Aave */

  const depositVaultWithAave = await new DepositVaultWithAaveTest__factory(
    owner,
  ).deploy();

  await depositVaultWithAave.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: parseUnits('100'),
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      minMTokenAmountForFirstDeposit: 0,
      maxSupplyCap: constants.MaxUint256,
    },
  );
  await depositVaultWithAave.setAavePool(
    stableCoins.usdc.address,
    aavePoolMock.address,
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_MINT_OPERATOR_ROLE(),
    depositVaultWithAave.address,
  );

  /* Deposit Vault With Morpho */

  const depositVaultWithMorpho = await new DepositVaultWithMorphoTest__factory(
    owner,
  ).deploy();

  await depositVaultWithMorpho.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: parseUnits('100'),
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      minMTokenAmountForFirstDeposit: 0,
      maxSupplyCap: constants.MaxUint256,
    },
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_MINT_OPERATOR_ROLE(),
    depositVaultWithMorpho.address,
  );

  /* Deposit Vault With MToken (deposits into mTBILL DV) */

  const depositVaultWithMToken = await new DepositVaultWithMTokenTest__factory(
    owner,
  ).deploy();

  await depositVaultWithMToken[
    'initialize((address,address,uint256,uint256,address,address,address,address,uint256,uint64,uint64,uint64,(uint256,uint256)[]),(uint256,uint256),address)'
  ](
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: parseUnits('100'),
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      minMTokenAmountForFirstDeposit: 0,
      maxSupplyCap: constants.MaxUint256,
    },
    depositVault.address,
  );

  await accessControl.grantRole(
    mTBILL.M_TBILL_MINT_OPERATOR_ROLE(),
    depositVaultWithMToken.address,
  );

  await depositVault.addWaivedFeeAccount(depositVaultWithMToken.address);

  /* Redemption Vault With MToken (mFONE -> mTBILL) */

  const mFONE = await new MTBILLTest__factory(owner).deploy();
  await mFONE.initialize(accessControl.address);

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

  const redemptionVaultWithMToken =
    await new RedemptionVaultWithMTokenTest__factory(owner).deploy();

  await redemptionVaultWithMToken[
    'initialize((address,address,uint256,uint256,address,address,address,address,uint256,uint64,uint64,uint64,(uint256,uint256)[]),(address,address,address,address,address,uint64),address)'
  ](
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTBILL.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: loanLp.address,
      loanLpFeeReceiver: loanLpFeeReceiver.address,
      loanRepaymentAddress: loanRepaymentAddress.address,
      loanSwapperVault: redemptionVaultLoanSwapper.address,
      maxLoanApr: 0,
    },
    redemptionVaultLoanSwapper.address,
  );

  await redemptionVaultLoanSwapper.addWaivedFeeAccount(
    redemptionVaultWithMToken.address,
  );
  await accessControl.grantRole(
    mTBILL.M_TBILL_BURN_OPERATOR_ROLE(),
    redemptionVaultWithMToken.address,
  );
  await accessControl.grantRole(
    mTokenLoan.M_TOKEN_TEST_BURN_OPERATOR_ROLE(),
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
  await accessControl.grantRole(
    await customFeed.CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE(),
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
  await accessControl.grantRole(
    allRoles.common.blacklistedOperator,
    blackListableTester.address,
  );
  await accessControl.grantRole(
    allRoles.common.greenlistedOperator,
    greenListableTester.address,
  );
  const greenlistAdmin = await greenListableTester.greenlistAdminRole();
  await accessControl.grantRole(greenlistAdmin, owner.address);

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

  await redemptionVault.setMaxApproveRequestId(100);
  await redemptionVaultLoanSwapper.setMaxApproveRequestId(100);
  await redemptionVaultWithUSTB.setMaxApproveRequestId(100);
  await redemptionVaultWithAave.setMaxApproveRequestId(100);
  await redemptionVaultWithMorpho.setMaxApproveRequestId(100);
  await redemptionVaultWithMToken.setMaxApproveRequestId(100);

  await depositVault.setMaxApproveRequestId(100);
  await depositVaultWithUSTB.setMaxApproveRequestId(100);
  await depositVaultWithAave.setMaxApproveRequestId(100);
  await depositVaultWithMorpho.setMaxApproveRequestId(100);
  await depositVaultWithMToken.setMaxApproveRequestId(100);

  return {
    customFeed,
    customFeedAdjusted,
    customFeedGrowth,
    mTBILL,
    mBASIS,
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
    feeReceiver,
    dataFeedDeprecated,
    dataFeedUnhealthy,
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
    mFONE,
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
    loanLpFeeReceiver,
    loanRepaymentAddress,
    redemptionVaultLoanSwapper,
    mTokenLoan,
    mTokenLoanToUsdDataFeed,
    mockedAggregatorMTokenLoan,
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
    feeReceiver,
    tokensReceiver,
    requestRedeemer,
    mTokenToUsdDataFeed,
  } = fx;

  const mTokenPermissioned = await new MTokenPermissionedTest__factory(
    owner,
  ).deploy();
  await mTokenPermissioned.initialize(accessControl.address);

  const mintRole = await mTokenPermissioned.M_TOKEN_TEST_MINT_OPERATOR_ROLE();
  const burnRole = await mTokenPermissioned.M_TOKEN_TEST_BURN_OPERATOR_ROLE();
  const pauseRole = await mTokenPermissioned.M_TOKEN_TEST_PAUSE_OPERATOR_ROLE();
  const mTokenPermissionedGreenlistedRole =
    await mTokenPermissioned.M_TOKEN_TEST_GREENLISTED_ROLE();

  await accessControl.grantRole(mintRole, owner.address);
  await accessControl.grantRole(burnRole, owner.address);
  await accessControl.grantRole(pauseRole, owner.address);

  const mTokenPermissionedDepositVault = await new DepositVaultTest__factory(
    owner,
  ).deploy();
  await mTokenPermissionedDepositVault.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: parseUnits('100'),
      mToken: mTokenPermissioned.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 100,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      minMTokenAmountForFirstDeposit: 0,
      maxSupplyCap: constants.MaxUint256,
    },
  );
  await accessControl.grantRole(
    mintRole,
    mTokenPermissionedDepositVault.address,
  );

  const mTokenPermissionedRedemptionVault =
    await new RedemptionVaultTest__factory(owner).deploy();
  await mTokenPermissionedRedemptionVault.initialize(
    {
      ac: accessControl.address,
      sanctionsList: mockedSanctionsList.address,
      variationTolerance: 1,
      minAmount: 1000,
      mToken: mTokenPermissioned.address,
      mTokenDataFeed: mTokenToUsdDataFeed.address,
      feeReceiver: feeReceiver.address,
      tokensReceiver: tokensReceiver.address,
      instantFee: 0,
      limitConfigs: [
        {
          limit: parseUnits('100000'),
          window: days(1),
        },
      ],
      minInstantFee: 0,
      maxInstantFee: 10000,
      maxInstantShare: 100_00,
    },
    {
      requestRedeemer: requestRedeemer.address,
      loanLp: constants.AddressZero,
      loanLpFeeReceiver: constants.AddressZero,
      loanRepaymentAddress: constants.AddressZero,
      loanSwapperVault: constants.AddressZero,
      maxLoanApr: 0,
    },
  );

  await mTokenPermissionedRedemptionVault.setMaxApproveRequestId(100);

  await accessControl.grantRole(
    burnRole,
    mTokenPermissionedRedemptionVault.address,
  );

  return {
    ...fx,
    mTokenPermissioned,
    mTokenPermissionedRoles: {
      mint: mintRole,
      burn: burnRole,
      pause: pauseRole,
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
