import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControlTest,
  MTBILLTest,
  RedemptionVaultWithUSTBTest,
  DataFeedTest,
  AggregatorV3Mock,
  DepositVaultWithUSTBTest,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';
import { setupUSTBAllowlist } from '../helpers/ustb-helpers';

// Fork block number where we know all fixture related addresses have funds
const FORK_BLOCK_NUMBER = 22540000;

async function setupUstbBase() {
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
    allRoles.tokenRoles.mTBILL.redemptionVaultAdmin,
    allRoles.tokenRoles.mTBILL.depositVaultAdmin,
    allRoles.common.greenlistedOperator,
  ];

  for (const role of rolesArray) {
    await accessControl.grantRole(role, owner.address);
  }

  await accessControl.grantRole(
    allRoles.tokenRoles.mTBILL.redemptionVaultAdmin,
    vaultAdmin.address,
  );

  await accessControl.grantRole(
    allRoles.tokenRoles.mTBILL.depositVaultAdmin,
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
  const ustbToken = await ethers.getContractAt(
    'ISuperstateToken',
    MAINNET_ADDRESSES.SUPERSTATE_TOKEN_PROXY,
  );
  const redemptionIdle = await ethers.getContractAt(
    'IUSTBRedemption',
    MAINNET_ADDRESSES.REDEMPTION_IDLE_PROXY,
  );

  // Impersonate whales
  const usdcWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USDC_WHALE,
  );
  const ustbWhale = await impersonateAndFundAccount(
    MAINNET_ADDRESSES.USTB_WHALE,
  );

  const ustbOwner = await impersonateAndFundAccount(
    await redemptionIdle.owner(),
  );

  const ustbTokenOwner = await impersonateAndFundAccount(
    await ustbToken.owner(),
  );

  return {
    accessControl,
    mTBILL,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    usdc,
    ustbToken,
    redemptionIdle,
    owner,
    tokensReceiver,
    feeReceiver,
    requestRedeemer,
    vaultAdmin,
    testUser,
    usdcWhale,
    ustbWhale,
    ustbOwner,
    ustbTokenOwner,
    roles: allRoles,
  };
}

export async function ustbDepositFixture() {
  const base = await setupUstbBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy DepositVaultWithUSTB
  const depositVaultWithUSTB =
    await deployProxyContract<DepositVaultWithUSTBTest>(
      'DepositVaultWithUSTBTest',
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
        MAINNET_ADDRESSES.SUPERSTATE_TOKEN_PROXY,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,uint256,uint256,address)',
    );

  // Grant MINTER_ROLE to vault
  await accessControl.grantRole(
    roles.tokenRoles.mTBILL.minter,
    depositVaultWithUSTB.address,
  );

  // Setup payment token
  await depositVaultWithUSTB.connect(owner).addPaymentToken(
    usdc.address,
    base.dataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  await setupUSTBAllowlist(base.ustbToken, depositVaultWithUSTB.address);
  await setupUSTBAllowlist(base.ustbToken, base.tokensReceiver.address);

  return {
    ...base,
    depositVaultWithUSTB,
  };
}

export async function ustbRedemptionFixture() {
  const base = await setupUstbBase();
  const { accessControl, mTBILL, owner, roles, usdc } = base;

  // Deploy RedemptionVaultWithUSTB
  const redemptionVaultWithUSTB =
    await deployProxyContract<RedemptionVaultWithUSTBTest>(
      'RedemptionVaultWithUSTBTest',
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
        MAINNET_ADDRESSES.REDEMPTION_IDLE_PROXY,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)',
    );

  // Grant BURN_ROLE to vault
  await accessControl.grantRole(
    roles.tokenRoles.mTBILL.burner,
    redemptionVaultWithUSTB.address,
  );

  // Setup payment token
  await redemptionVaultWithUSTB.connect(owner).addPaymentToken(
    usdc.address,
    base.dataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  return {
    ...base,
    redemptionVaultWithUSTB,
  };
}

export type UstbDepositContracts = Awaited<
  ReturnType<typeof ustbDepositFixture>
>;

export type UstbRedemptionContracts = Awaited<
  ReturnType<typeof ustbRedemptionFixture>
>;
