import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import {
  RedemptionVaultWithUSTBTest,
  DataFeedTest,
  AggregatorV3Mock,
  DepositVaultWithUSTBTest,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import {
  getInitializerParamsDvWithUstb,
  getInitializerParamsRvWithUstb,
} from '../../common/fixtures';
import {
  DV_USTB_INIT_FN,
  RV_USTB_INIT_FN,
} from '../../common/vault-initializer.helpers';
import { setupIntegrationBase } from '../helpers/ac.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';
import { setupUSTBAllowlist } from '../helpers/ustb-helpers';

// Fork block number where we know all fixture related addresses have funds
const FORK_BLOCK_NUMBER = 22540000;

async function setupUstbBase() {
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
      getInitializerParamsDvWithUstb({
        accessControl: accessControl.address,
        mockedSanctionsList: ethers.constants.AddressZero,
        mTBILL: mTBILL.address,
        mTokenToUsdDataFeed: base.mTokenToUsdDataFeed.address,
        tokensReceiver: base.tokensReceiver.address,
        minAmount: parseUnits('0'),
        instantFee: 100,
        variationTolerance: 200,
        maxApproveRequestId: ethers.constants.MaxUint256,
        ustbToken: MAINNET_ADDRESSES.SUPERSTATE_TOKEN_PROXY,
      }),
      DV_USTB_INIT_FN,
    );

  // Grant MINTER_ROLE to vault
  await accessControl['grantRole(bytes32,address)'](
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
      getInitializerParamsRvWithUstb({
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
        ustbRedemption: MAINNET_ADDRESSES.REDEMPTION_IDLE_PROXY,
      }),
      RV_USTB_INIT_FN,
    );

  // Grant BURN_ROLE to vault
  await accessControl['grantRole(bytes32,address)'](
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
