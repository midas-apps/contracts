import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControlTest,
  MTBILLTest,
  RedemptionVaultWithAaveTest,
  DataFeedTest,
  AggregatorV3Mock,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import { impersonateAndFundAccount, resetFork } from '../helpers/fork.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';

export const FORK_BLOCK_NUMBER = 24441000;

export async function aaveRedemptionVaultFixture() {
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
    allRoles.common.greenlistedOperator,
  ];

  for (const role of rolesArray) {
    await accessControl.grantRole(role, owner.address);
  }

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

  // Deploy RedemptionVaultWithAave
  const redemptionVaultWithAave =
    await deployProxyContract<RedemptionVaultWithAaveTest>(
      'RedemptionVaultWithAaveTest',
      [
        accessControl.address,
        {
          mToken: mTBILL.address,
          mTokenDataFeed: mtbillDataFeed.address,
        },
        {
          feeReceiver: feeReceiver.address,
          tokensReceiver: tokensReceiver.address,
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
        requestRedeemer.address,
        MAINNET_ADDRESSES.AAVE_V3_POOL,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)',
    );

  // Grant BURN_ROLE to vault
  await accessControl.grantRole(
    allRoles.tokenRoles.mTBILL.burner,
    redemptionVaultWithAave.address,
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

  // Setup payment token
  await redemptionVaultWithAave.connect(owner).addPaymentToken(
    usdc.address,
    usdcDataFeed.address,
    0, // no fee
    ethers.constants.MaxUint256,
    true, // is stable
  );

  return {
    accessControl,
    mTBILL,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    redemptionVaultWithAave,
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

export type AaveDeployedContracts = Awaited<
  ReturnType<typeof aaveRedemptionVaultFixture>
>;
