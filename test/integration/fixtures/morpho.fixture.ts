import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import {
  DepositVaultWithMorphoTest,
  RedemptionVaultWithMorphoTest,
  DataFeedTest,
  AggregatorV3Mock,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import {
  getInitializerParamsDv,
  getInitializerParamsRv,
} from '../../common/fixtures';
import { setupIntegrationBase } from '../helpers/ac.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';

// Block where Steakhouse USDC Morpho vault is active and has liquidity
const FORK_BLOCK_NUMBER = 24441000;

async function setupMorphoBase() {
  await resetFork(rpcUrls.main, FORK_BLOCK_NUMBER);

  const {
    accessControl,
    mTBILL,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    roles: allRoles,
  } = await setupIntegrationBase();

  const usdcAggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  await usdcAggregator.setRoundData(
    parseUnits('1', await usdcAggregator.decimals()),
  );

  const mtbillAggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  await mtbillAggregator.setRoundData(
    parseUnits('1', await mtbillAggregator.decimals()),
  );

  const usdcDataFeed = await deployProxyContract<DataFeedTest>('DataFeedTest', [
    accessControl.address,
    usdcAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', await usdcAggregator.decimals()),
    parseUnits('10000', await usdcAggregator.decimals()),
  ]);

  const usdtAggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  await usdtAggregator.setRoundData(
    parseUnits('1', await usdtAggregator.decimals()),
  );

  const usdtDataFeed = await deployProxyContract<DataFeedTest>('DataFeedTest', [
    accessControl.address,
    usdtAggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', await usdtAggregator.decimals()),
    parseUnits('10000', await usdtAggregator.decimals()),
  ]);

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

  // Get mainnet contracts
  const usdc = await ethers.getContractAt(
    'IERC20Metadata',
    MAINNET_ADDRESSES.USDC,
  );
  const morphoVault = await ethers.getContractAt(
    'IERC20',
    MAINNET_ADDRESSES.MORPHO_STEAKHOUSE_USDC_VAULT,
  );
  const usdt = await ethers.getContractAt(
    'IERC20Metadata',
    MAINNET_ADDRESSES.USDT,
  );
  const morphoUsdtVault = await ethers.getContractAt(
    'IERC20',
    MAINNET_ADDRESSES.MORPHO_SMOKEHOUSE_USDT_VAULT,
  );

  // Impersonate whales
  const usdcWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USDC_WHALE_BINANCE,
  );
  const morphoShareWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.MORPHO_STEAKHOUSE_USDC_WHALE,
  );
  const usdtWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USDT_WHALE_BINANCE,
  );
  const morphoUsdtShareWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.MORPHO_SMOKEHOUSE_USDT_WHALE,
  );

  return {
    accessControl,
    mTBILL,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    usdc,
    morphoVault,
    usdt,
    morphoUsdtVault,
    usdtDataFeed,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    usdcWhale,
    morphoShareWhale,
    usdtWhale,
    morphoUsdtShareWhale,
    roles: allRoles,
  };
}

export async function morphoDepositFixture() {
  const base = await setupMorphoBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy DepositVaultWithMorpho
  const depositVaultWithMorpho =
    await deployProxyContract<DepositVaultWithMorphoTest>(
      'DepositVaultWithMorphoTest',
      getInitializerParamsDv({
        accessControl: accessControl.address,
        mockedSanctionsList: ethers.constants.AddressZero,
        mTBILL: mTBILL.address,
        mTokenToUsdDataFeed: base.mTokenToUsdDataFeed.address,
        tokensReceiver: base.tokensReceiver.address,
        minAmount: parseUnits('0'),
        instantFee: 100,
        variationTolerance: 200,
        maxApproveRequestId: ethers.constants.MaxUint256,
      }),
      undefined,
    );

  // Grant MINTER_ROLE to deposit vault
  await accessControl['grantRole(bytes32,address)'](
    roles.tokenRoles.mTBILL.minter,
    depositVaultWithMorpho.address,
  );

  // Setup payment token
  await depositVaultWithMorpho.connect(owner).addPaymentToken(
    usdc.address,
    base.dataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  // Configure Morpho vault mapping for USDC
  await depositVaultWithMorpho
    .connect(owner)
    .setMorphoVault(
      usdc.address,
      MAINNET_ADDRESSES.MORPHO_STEAKHOUSE_USDC_VAULT,
    );

  await depositVaultWithMorpho
    .connect(owner)
    .addPaymentToken(
      base.usdt.address,
      base.usdtDataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );
  await depositVaultWithMorpho
    .connect(owner)
    .setMorphoVault(
      base.usdt.address,
      MAINNET_ADDRESSES.MORPHO_SMOKEHOUSE_USDT_VAULT,
    );

  return {
    ...base,
    depositVaultWithMorpho,
  };
}

export async function morphoRedemptionFixture() {
  const base = await setupMorphoBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy RedemptionVaultWithMorpho
  const redemptionVaultWithMorpho =
    await deployProxyContract<RedemptionVaultWithMorphoTest>(
      'RedemptionVaultWithMorphoTest',
      getInitializerParamsRv({
        accessControl: accessControl.address,
        mockedSanctionsList: ethers.constants.AddressZero,
        mTBILL: mTBILL.address,
        mTokenToUsdDataFeed: base.mTokenToUsdDataFeed.address,
        tokensReceiver: base.tokensReceiver.address,
        minAmount: parseUnits('100', 18),
        instantFee: 100,
        variationTolerance: 200,
        maxApproveRequestId: ethers.constants.MaxUint256,
        requestRedeemer: base.requestRedeemer.address,
      }),
      undefined,
    );

  // Grant BURN_ROLE to redemption vault
  await accessControl['grantRole(bytes32,address)'](
    roles.tokenRoles.mTBILL.burner,
    redemptionVaultWithMorpho.address,
  );

  // Setup payment token
  await redemptionVaultWithMorpho.connect(owner).addPaymentToken(
    usdc.address,
    base.dataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  // Configure Morpho vault mapping for USDC
  await redemptionVaultWithMorpho
    .connect(owner)
    .setMorphoVault(
      usdc.address,
      MAINNET_ADDRESSES.MORPHO_STEAKHOUSE_USDC_VAULT,
    );

  await redemptionVaultWithMorpho
    .connect(owner)
    .addPaymentToken(
      base.usdt.address,
      base.usdtDataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );
  await redemptionVaultWithMorpho
    .connect(owner)
    .setMorphoVault(
      base.usdt.address,
      MAINNET_ADDRESSES.MORPHO_SMOKEHOUSE_USDT_VAULT,
    );

  return {
    ...base,
    redemptionVaultWithMorpho,
  };
}

export type MorphoDepositContracts = Awaited<
  ReturnType<typeof morphoDepositFixture>
>;

export type MorphoRedemptionContracts = Awaited<
  ReturnType<typeof morphoRedemptionFixture>
>;
