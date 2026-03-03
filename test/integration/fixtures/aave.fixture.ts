import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControlTest,
  MTBILLTest,
  DepositVaultWithAaveTest,
  RedemptionVaultWithAaveTest,
  DataFeedTest,
  AggregatorV3Mock,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';

const FORK_BLOCK_NUMBER = 24441000;

async function setupAaveBase() {
  await resetFork(rpcUrls.main, FORK_BLOCK_NUMBER);

  const [
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
  ] = await ethers.getSigners();
  const allRoles = getAllRoles();

  const accessControl = await deployProxyContract<MidasAccessControlTest>(
    'MidasAccessControlTest',
    [],
  );

  const mTBILL = await deployProxyContract<MTBILLTest>('mTBILLTest', [
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

  return {
    accessControl,
    mTBILL,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    usdc,
    aUsdc,
    aavePool,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    usdcWhale,
    aUsdcWhale,
    roles: allRoles,
  };
}

export async function aaveDepositFixture() {
  const base = await setupAaveBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy DepositVaultWithAave
  const depositVaultWithAave =
    await deployProxyContract<DepositVaultWithAaveTest>(
      'DepositVaultWithAaveTest',
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
        ethers.constants.AddressZero, // sanctions list
        200,
        parseUnits('0'),
        0,
        ethers.constants.MaxUint256,
        MAINNET_ADDRESSES.AAVE_V3_POOL,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,uint256,address)',
    );

  // Grant MINTER_ROLE to deposit vault
  await accessControl.grantRole(
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
          instantFee: 100, // 1%
          instantDailyLimit: ethers.constants.MaxUint256,
        },
        ethers.constants.AddressZero, // sanctions list
        200, // variation tolerance 2%
        parseUnits('100', 18), // min amount
        {
          minFiatRedeemAmount: parseUnits('1000', 18),
          fiatAdditionalFee: 100,
          fiatFlatFee: parseUnits('10', 18),
        },
        base.requestRedeemer.address,
        MAINNET_ADDRESSES.AAVE_V3_POOL,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)',
    );

  // Grant BURN_ROLE to redemption vault
  await accessControl.grantRole(
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
