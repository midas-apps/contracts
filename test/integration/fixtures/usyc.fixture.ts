import { BigNumber } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  AggregatorV3Mock,
  DataFeedTest,
  DepositVaultTest,
  DepositVaultWithUSYCTest,
  RedemptionVaultTest,
  RedemptionVaultWithUSYCTest,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import {
  getInitializerParamsDv,
  getInitializerParamsDvWithUsyc,
  getInitializerParamsRv,
  getInitializerParamsRvWithUsyc,
} from '../../common/fixtures';
import {
  DV_USYC_INIT_FN,
  RV_USYC_INIT_FN,
} from '../../common/vault-initializer.helpers';
import {
  deployIntegrationMToken,
  setupIntegrationBase,
} from '../helpers/ac.helpers';
import {
  ARC_ADDRESSES,
  resetArcFork,
  setTellerLiquidity,
  setUsycEntitlement,
} from '../helpers/usyc.helpers';

const deployFeed = async (accessControl: string, price: BigNumber) => {
  const aggregator = (await (
    await ethers.getContractFactory('AggregatorV3Mock')
  ).deploy()) as AggregatorV3Mock;
  const decimals = await aggregator.decimals();
  await aggregator.setRoundData(price.div(parseUnits('1', 18 - decimals)));

  const feed = await deployProxyContract<DataFeedTest>('DataFeedTest', [
    accessControl,
    aggregator.address,
    3 * 24 * 3600,
    parseUnits('0.1', decimals),
    parseUnits('10000', decimals),
    ethers.constants.AddressZero,
  ]);

  return { aggregator, feed };
};

/**
 * Radial setup on an Arc fork with the real USYC Teller, USYC and entitlements:
 * - radUSD: mToken backed 1:1 by USDC, plain DV/RV with 0 fee
 * - radYC: mToken whose DV/RV are the USYC strategy vaults, radUSD is the
 *   payment token, radYC DV sends USYC to radYC RV (its tokensReceiver)
 */
export async function usycArcFixture() {
  const { usdc, teller, usyc, entitlements } = await resetArcFork();

  const base = await setupIntegrationBase();
  const {
    accessControl,
    owner,
    tokensReceiver,
    requestRedeemer,
    clawbackReceiver,
    testUser,
    regularUsers,
    roles,
  } = base;
  const tokenRoles = roles.tokenRoles.mTBILL;

  // radYC reuses mTBILL roles, radUSD is a second mToken with the same roles
  const radYC = base.mTBILL;
  const radUSD = await deployIntegrationMToken(
    accessControl.address,
    clawbackReceiver.address,
    tokenRoles,
    { name: 'radUSD', symbol: 'radUSD' },
  );

  const [, , redeemPrice] = await teller.previewRedeemData(
    testUser.address,
    parseUnits('1', 6),
  );

  const usdcFeed = await deployFeed(accessControl.address, parseUnits('1'));
  const radUsdFeed = await deployFeed(accessControl.address, parseUnits('1'));
  // radYC is priced like USYC (1 radYC per USYC)
  const radYcFeed = await deployFeed(accessControl.address, redeemPrice);

  const vaultParams = {
    accessControl: accessControl.address,
    mockedSanctionsList: ethers.constants.AddressZero,
    minAmount: 0,
    instantFee: 0,
    variationTolerance: 200,
    maxApproveRequestId: ethers.constants.MaxUint256,
  };

  /* radUSD vaults */

  const radUsdDepositVault = await deployProxyContract<DepositVaultTest>(
    'DepositVaultTest',
    getInitializerParamsDv({
      ...vaultParams,
      mTBILL: radUSD.address,
      mTokenToUsdDataFeed: radUsdFeed.feed.address,
      tokensReceiver: regularUsers[0].address,
    }),
  );
  const radUsdRedemptionVault = await deployProxyContract<RedemptionVaultTest>(
    'RedemptionVaultTest',
    getInitializerParamsRv({
      ...vaultParams,
      mTBILL: radUSD.address,
      mTokenToUsdDataFeed: radUsdFeed.feed.address,
      tokensReceiver: regularUsers[0].address,
      requestRedeemer: requestRedeemer.address,
    }),
  );

  /* radYC vaults */

  const library = await (
    await ethers.getContractFactory('VaultsWithUSYCLibrary')
  ).deploy();

  const redemptionVaultWithUSYC =
    await deployProxyContract<RedemptionVaultWithUSYCTest>(
      'RedemptionVaultWithUSYCTest',
      getInitializerParamsRvWithUsyc({
        ...vaultParams,
        mTBILL: radYC.address,
        mTokenToUsdDataFeed: radYcFeed.feed.address,
        tokensReceiver: tokensReceiver.address,
        requestRedeemer: requestRedeemer.address,
        usycTeller: teller.address,
        usycDepositVault: radUsdDepositVault.address,
      }),
      RV_USYC_INIT_FN,
      undefined,
      { VaultsWithUSYCLibrary: library.address },
    );

  const depositVaultWithUSYC =
    await deployProxyContract<DepositVaultWithUSYCTest>(
      'DepositVaultWithUSYCTest',
      getInitializerParamsDvWithUsyc({
        ...vaultParams,
        mTBILL: radYC.address,
        mTokenToUsdDataFeed: radYcFeed.feed.address,
        // USYC proceeds go straight into the radYC RV
        tokensReceiver: redemptionVaultWithUSYC.address,
        usycTeller: teller.address,
        usycRedemptionVault: radUsdRedemptionVault.address,
      }),
      DV_USYC_INIT_FN,
    );

  // the vaults compare against the rates the Teller reports for themselves
  await redemptionVaultWithUSYC
    .connect(owner)
    .setAnticipatedFeeRate(
      await teller.redemptionFeeRate(redemptionVaultWithUSYC.address),
    );
  await depositVaultWithUSYC
    .connect(owner)
    .setAnticipatedFeeRate(
      await teller.subscriptionFeeRate(depositVaultWithUSYC.address),
    );

  /* Midas roles, payment tokens and fee waivers */

  const grant = (role: string, account: string) =>
    accessControl['grantRole(bytes32,address)'](role, account);

  await grant(tokenRoles.minter, radUsdDepositVault.address);
  await grant(tokenRoles.burner, radUsdRedemptionVault.address);
  await grant(tokenRoles.minter, depositVaultWithUSYC.address);
  await grant(tokenRoles.burner, redemptionVaultWithUSYC.address);

  const addPaymentToken = (
    vault: { addPaymentToken: DepositVaultTest['addPaymentToken'] },
    token: string,
    feed: string,
  ) =>
    vault
      .connect(owner)
      .addPaymentToken(token, feed, 0, ethers.constants.MaxUint256, true);

  await addPaymentToken(
    radUsdDepositVault,
    usdc.address,
    usdcFeed.feed.address,
  );
  await addPaymentToken(
    radUsdRedemptionVault,
    usdc.address,
    usdcFeed.feed.address,
  );
  await addPaymentToken(
    depositVaultWithUSYC,
    radUSD.address,
    radUsdFeed.feed.address,
  );
  await addPaymentToken(
    redemptionVaultWithUSYC,
    radUSD.address,
    radUsdFeed.feed.address,
  );

  await radUsdRedemptionVault
    .connect(owner)
    .setWaivedFeeAccount(depositVaultWithUSYC.address, true);
  await radUsdDepositVault
    .connect(owner)
    .setWaivedFeeAccount(redemptionVaultWithUSYC.address, true);

  await depositVaultWithUSYC.connect(owner).setUsycDepositsEnabled(true);

  /* Circle onboarding: both radYC vaults deposit/redeem and hold USYC */

  await setUsycEntitlement(entitlements, depositVaultWithUSYC.address);
  await setUsycEntitlement(entitlements, redemptionVaultWithUSYC.address);

  /* Liquidity */

  // radUSD RV pays USDC out for radUSD redemptions made by the radYC DV
  await usdc.mint(radUsdRedemptionVault.address, parseUnits('1000000', 6));
  // Teller redemption liquidity sits in the Circle treasury
  await setTellerLiquidity(
    teller,
    usdc,
    redemptionVaultWithUSYC.address,
    parseUnits('1000000', 6),
  );

  // test user holds radUSD, obtained by depositing USDC into the radUSD DV
  await usdc.mint(testUser.address, parseUnits('100000', 6));
  await usdc
    .connect(testUser)
    .approve(radUsdDepositVault.address, ethers.constants.MaxUint256);
  await radUsdDepositVault
    .connect(testUser)
    ['depositInstant(address,uint256,uint256,bytes32)'](
      usdc.address,
      parseUnits('50000'),
      0,
      ethers.constants.HashZero,
    );

  return {
    ...base,
    usdc,
    usyc,
    teller,
    entitlements,
    radUSD,
    radYC,
    usdcFeed,
    radUsdFeed,
    radYcFeed,
    radUsdDepositVault,
    radUsdRedemptionVault,
    depositVaultWithUSYC,
    redemptionVaultWithUSYC,
    arcAddresses: ARC_ADDRESSES,
  };
}

export type UsycArcContracts = Awaited<ReturnType<typeof usycArcFixture>>;
