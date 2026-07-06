import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import {
  DepositVaultWithAaveTest,
  RedemptionVaultWithAaveTest,
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

const FORK_BLOCK_NUMBER = 24441000;

async function setupAaveBase() {
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
    clawbackReceiver,
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
  const aUsdc = await ethers.getContractAt('IERC20', MAINNET_ADDRESSES.AUSDC);
  const usdt = await ethers.getContractAt(
    'IERC20Metadata',
    MAINNET_ADDRESSES.USDT,
  );
  const aUsdt = await ethers.getContractAt('IERC20', MAINNET_ADDRESSES.AUSDT);
  const aavePool = await ethers.getContractAt(
    'IAaveV3Pool',
    MAINNET_ADDRESSES.AAVE_V3_POOL,
  );

  // Impersonate whales
  const usdcWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USDC_WHALE_BINANCE,
  );
  const aUsdcWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.AUSDC_WHALE,
  );
  const usdtWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USDT_WHALE_BINANCE,
  );
  const aUsdtWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.AUSDT_WHALE,
  );

  return {
    accessControl,
    mTBILL,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    usdc,
    aUsdc,
    usdt,
    aUsdt,
    usdtDataFeed,
    aavePool,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    usdcWhale,
    aUsdcWhale,
    usdtWhale,
    aUsdtWhale,
    roles: allRoles,
    clawbackReceiver,
  };
}

export async function aaveDepositFixture() {
  const base = await setupAaveBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy DepositVaultWithAave
  const depositVaultWithAave =
    await deployProxyContract<DepositVaultWithAaveTest>(
      'DepositVaultWithAaveTest',
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
    depositVaultWithAave.address,
  );

  // Setup payment token
  await depositVaultWithAave.connect(owner).addPaymentToken(
    usdc.address,
    base.dataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  // Configure Aave pool mapping for USDC
  await depositVaultWithAave
    .connect(owner)
    .setAavePool(usdc.address, MAINNET_ADDRESSES.AAVE_V3_POOL);

  await depositVaultWithAave
    .connect(owner)
    .addPaymentToken(
      base.usdt.address,
      base.usdtDataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );
  await depositVaultWithAave
    .connect(owner)
    .setAavePool(base.usdt.address, MAINNET_ADDRESSES.AAVE_V3_POOL);

  return {
    ...base,
    depositVaultWithAave,
  };
}

export async function aaveRedemptionFixture() {
  const base = await setupAaveBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy RedemptionVaultWithAave
  const redemptionVaultWithAave =
    await deployProxyContract<RedemptionVaultWithAaveTest>(
      'RedemptionVaultWithAaveTest',
      getInitializerParamsRv({
        accessControl: accessControl.address,
        mockedSanctionsList: ethers.constants.AddressZero,
        mTBILL: mTBILL.address,
        mTokenToUsdDataFeed: base.mTokenToUsdDataFeed.address,
        tokensReceiver: base.tokensReceiver.address,
        minAmount: parseUnits('0'),
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
    redemptionVaultWithAave.address,
  );

  // Setup payment token
  await redemptionVaultWithAave.connect(owner).addPaymentToken(
    usdc.address,
    base.dataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  // Configure Aave pool mapping for USDC
  await redemptionVaultWithAave
    .connect(owner)
    .setAavePool(usdc.address, MAINNET_ADDRESSES.AAVE_V3_POOL);

  await redemptionVaultWithAave
    .connect(owner)
    .addPaymentToken(
      base.usdt.address,
      base.usdtDataFeed.address,
      0,
      ethers.constants.MaxUint256,
      true,
    );
  await redemptionVaultWithAave
    .connect(owner)
    .setAavePool(base.usdt.address, MAINNET_ADDRESSES.AAVE_V3_POOL);

  return {
    ...base,
    redemptionVaultWithAave,
  };
}

export type AaveDepositContracts = Awaited<
  ReturnType<typeof aaveDepositFixture>
>;

export type AaveRedemptionContracts = Awaited<
  ReturnType<typeof aaveRedemptionFixture>
>;
