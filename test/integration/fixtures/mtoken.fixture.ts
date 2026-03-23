import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControlTest,
  MTBILLTest,
  DepositVaultTest,
  DepositVaultWithMTokenTest,
  RedemptionVaultTest,
  RedemptionVaultWithMTokenTest,
  DataFeedTest,
  AggregatorV3Mock,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';

const FORK_BLOCK_NUMBER = 24441000;

async function setupMTokenBase() {
  await resetFork(rpcUrls.main, FORK_BLOCK_NUMBER);

  const [
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    targetTokensReceiver,
  ] = await ethers.getSigners();
  const allRoles = getAllRoles();

  const accessControl = await deployProxyContract<MidasAccessControlTest>(
    'MidasAccessControlTest',
    [],
  );

  // "Target" mToken (simulating mTBILL)
  const mTBILL = await deployProxyContract<MTBILLTest>('mTBILLTest', [
    accessControl.address,
  ]);

  // "Product" mToken (simulating mFONE)
  const mFONE = await deployProxyContract<MTBILLTest>('mTBILLTest', [
    accessControl.address,
  ]);

  const rolesArray = [
    allRoles.common.defaultAdmin,
    allRoles.tokenRoles.mTBILL.minter,
    allRoles.tokenRoles.mTBILL.burner,
    allRoles.tokenRoles.mTBILL.pauser,
    allRoles.tokenRoles.mTBILL.depositVaultAdmin,
    allRoles.tokenRoles.mTBILL.redemptionVaultAdmin,
    allRoles.common.greenlistedOperator,
  ];

  for (const role of rolesArray) {
    await accessControl.grantRole(role, owner.address);
  }

  await accessControl.grantRole(
    allRoles.tokenRoles.mTBILL.depositVaultAdmin,
    vaultAdmin.address,
  );

  await accessControl.grantRole(
    allRoles.tokenRoles.mTBILL.redemptionVaultAdmin,
    vaultAdmin.address,
  );

  await accessControl.grantRole(allRoles.common.greenlisted, testUser.address);

  // USDC data feed
  const usdcAggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  await usdcAggregator.setRoundData(
    parseUnits('1', await usdcAggregator.decimals()),
  );

  const usdcDataFeed = await deployProxyContract<DataFeedTest>('DataFeedTest', [
    accessControl.address,
    usdcAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', await usdcAggregator.decimals()),
    parseUnits('10000', await usdcAggregator.decimals()),
  ]);

  // Target mToken (mTBILL) data feed
  const mtbillAggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  await mtbillAggregator.setRoundData(
    parseUnits('1', await mtbillAggregator.decimals()),
  );

  const mtbillDataFeed = await deployProxyContract<DataFeedTest>(
    'DataFeedTest',
    [
      accessControl.address,
      mtbillAggregator.address,
      3 * 24 * 3600,
      parseUnits('0.1', await mtbillAggregator.decimals()),
      parseUnits('10000', await mtbillAggregator.decimals()),
    ],
  );

  // Product mToken (mFONE) data feed
  const mfoneAggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  await mfoneAggregator.setRoundData(
    parseUnits('1', await mfoneAggregator.decimals()),
  );

  const mfoneDataFeed = await deployProxyContract<DataFeedTest>(
    'DataFeedTest',
    [
      accessControl.address,
      mfoneAggregator.address,
      3 * 24 * 3600,
      parseUnits('0.1', await mfoneAggregator.decimals()),
      parseUnits('10000', await mfoneAggregator.decimals()),
    ],
  );

  // Get mainnet USDC
  const usdc = await ethers.getContractAt(
    'IERC20Metadata',
    MAINNET_ADDRESSES.USDC,
  );

  // Impersonate USDC whale
  const usdcWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USDC_WHALE_BINANCE,
  );

  return {
    accessControl,
    mTBILL,
    mFONE,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mFoneToUsdDataFeed: mfoneDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    mockedAggregatorMFone: mfoneAggregator,
    usdc,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    targetTokensReceiver,
    usdcWhale,
    roles: allRoles,
  };
}

export async function mTokenDepositFixture() {
  const base = await setupMTokenBase();
  const { accessControl, mTBILL, mFONE, owner, roles, usdc } = base;

  // Deploy target DV (plain DepositVault for mTBILL, 0% fee)
  // Uses a separate tokensReceiver so USDC flowing through the target DV
  // doesn't contaminate the product DV's tokensReceiver balance assertions
  const targetDepositVault = await deployProxyContract<DepositVaultTest>(
    'DepositVaultTest',
    [
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: base.mTokenToUsdDataFeed.address,
      },
      {
        feeReceiver: base.feeReceiver.address,
        tokensReceiver: base.targetTokensReceiver.address,
      },
      {
        instantFee: 0,
        instantDailyLimit: ethers.constants.MaxUint256,
      },
      ethers.constants.AddressZero,
      200,
      parseUnits('0'),
      0,
      ethers.constants.MaxUint256,
    ],
  );

  // Grant minter to target DV (so it can mint mTBILL)
  await accessControl.grantRole(
    roles.tokenRoles.mTBILL.minter,
    targetDepositVault.address,
  );

  // Add USDC as payment token on target DV
  await targetDepositVault
    .connect(owner)
    .addPaymentToken(
      usdc.address,
      base.dataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );

  // Deploy product DV (DepositVaultWithMToken for mFONE)
  const depositVaultWithMToken =
    await deployProxyContract<DepositVaultWithMTokenTest>(
      'DepositVaultWithMTokenTest',
      [
        accessControl.address,
        {
          mToken: mFONE.address,
          mTokenDataFeed: base.mFoneToUsdDataFeed.address,
        },
        {
          feeReceiver: base.feeReceiver.address,
          tokensReceiver: base.tokensReceiver.address,
        },
        {
          instantFee: 100,
          instantDailyLimit: ethers.constants.MaxUint256,
        },
        ethers.constants.AddressZero,
        200,
        parseUnits('0'),
        0,
        ethers.constants.MaxUint256,
        targetDepositVault.address,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,uint256,address)',
    );

  // Grant minter to product DV (so it can mint mFONE)
  await accessControl.grantRole(
    roles.tokenRoles.mTBILL.minter,
    depositVaultWithMToken.address,
  );

  // Greenlist the product DV so it can call depositInstant on target DV
  await accessControl.grantRole(
    roles.common.greenlisted,
    depositVaultWithMToken.address,
  );

  // Add USDC as payment token on product DV
  await depositVaultWithMToken
    .connect(owner)
    .addPaymentToken(
      usdc.address,
      base.dataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );

  return {
    ...base,
    targetDepositVault,
    depositVaultWithMToken,
  };
}

export async function mTokenRedemptionFixture() {
  const base = await setupMTokenBase();
  const { accessControl, mTBILL, mFONE, owner, roles, usdc } = base;

  // Deploy target RV (plain RedemptionVault for mTBILL)
  const targetRedemptionVault = await deployProxyContract<RedemptionVaultTest>(
    'RedemptionVaultTest',
    [
      accessControl.address,
      {
        mToken: mTBILL.address,
        mTokenDataFeed: base.mTokenToUsdDataFeed.address,
      },
      {
        feeReceiver: base.feeReceiver.address,
        tokensReceiver: base.tokensReceiver.address,
      },
      {
        instantFee: 100,
        instantDailyLimit: ethers.constants.MaxUint256,
      },
      ethers.constants.AddressZero,
      200,
      parseUnits('100', 18),
      {
        minFiatRedeemAmount: parseUnits('1000', 18),
        fiatAdditionalFee: 100,
        fiatFlatFee: parseUnits('10', 18),
      },
      base.requestRedeemer.address,
    ],
  );

  // Grant BURN_ROLE to target RV (so it can burn mTBILL)
  await accessControl.grantRole(
    roles.tokenRoles.mTBILL.burner,
    targetRedemptionVault.address,
  );

  // Add USDC as payment token on target RV
  await targetRedemptionVault
    .connect(owner)
    .addPaymentToken(
      usdc.address,
      base.dataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );

  // Fund target RV with USDC (so inner redeemInstant has liquidity)
  await usdc
    .connect(base.usdcWhale)
    .transfer(targetRedemptionVault.address, parseUnits('100000', 6));

  // Deploy product RV (RedemptionVaultWithMToken for mFONE)
  const redemptionVaultWithMToken =
    await deployProxyContract<RedemptionVaultWithMTokenTest>(
      'RedemptionVaultWithMTokenTest',
      [
        accessControl.address,
        {
          mToken: mFONE.address,
          mTokenDataFeed: base.mFoneToUsdDataFeed.address,
        },
        {
          feeReceiver: base.feeReceiver.address,
          tokensReceiver: base.tokensReceiver.address,
        },
        {
          instantFee: 100,
          instantDailyLimit: ethers.constants.MaxUint256,
        },
        ethers.constants.AddressZero,
        200,
        parseUnits('100', 18),
        {
          minFiatRedeemAmount: parseUnits('1000', 18),
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('10', 18),
        },
        base.requestRedeemer.address,
        targetRedemptionVault.address,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)',
    );

  // Grant BURN_ROLE to product RV (so it can burn mFONE)
  await accessControl.grantRole(
    roles.tokenRoles.mTBILL.burner,
    redemptionVaultWithMToken.address,
  );

  // Add USDC as payment token on product RV
  await redemptionVaultWithMToken
    .connect(owner)
    .addPaymentToken(
      usdc.address,
      base.dataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );

  // Greenlist the product RV on access control (target RV requires greenlist)
  await accessControl.grantRole(
    roles.common.greenlisted,
    redemptionVaultWithMToken.address,
  );

  // Waive fees on target RV for the product RV address
  await targetRedemptionVault
    .connect(owner)
    .addWaivedFeeAccount(redemptionVaultWithMToken.address);

  // Mint mTBILL to product RV (simulating Fordefi deposit)
  await accessControl.grantRole(roles.tokenRoles.mTBILL.minter, owner.address);
  await mTBILL.mint(redemptionVaultWithMToken.address, parseUnits('50000'));

  return {
    ...base,
    targetRedemptionVault,
    redemptionVaultWithMToken,
  };
}

export type MTokenDepositContracts = Awaited<
  ReturnType<typeof mTokenDepositFixture>
>;

export type MTokenRedemptionContracts = Awaited<
  ReturnType<typeof mTokenRedemptionFixture>
>;
