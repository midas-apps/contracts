import { impersonateAccount } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers, network } from 'hardhat';

import { rpcUrls } from '../../../config';
import { getAllRoles } from '../../../helpers/roles';
import {
  MidasAccessControlTest,
  MTBILLTest,
  RedemptionVaultWithUSTBTest,
  DataFeedTest,
  AggregatorV3Mock,
} from '../../../typechain-types';
import { deployProxyContract } from '../../common/deploy.helpers';
import { MAINNET_ADDRESSES } from '../helpers/mainnet-addresses';

async function impersonateAndFundAccount(
  address: string,
): Promise<SignerWithAddress> {
  await impersonateAccount(address);
  await network.provider.send('hardhat_setBalance', [
    address,
    ethers.utils.hexStripZeros(parseUnits('1000', 18).toHexString()),
  ]);
  return ethers.getSigner(address);
}

// Fork block number where we know all fixture related addresses have funds
export const FORK_BLOCK_NUMBER = 22540000;

export async function ustbRedemptionVaultFixture() {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: rpcUrls.main,
          blockNumber: FORK_BLOCK_NUMBER,
        },
      },
    ],
  });
  await network.provider.send('evm_setAutomine', [true]);

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

  // Deploy RedemptionVaultWithUSTB
  const redemptionVaultWithUSTB =
    await deployProxyContract<RedemptionVaultWithUSTBTest>(
      'RedemptionVaultWithUSTBTest',
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
        MAINNET_ADDRESSES.REDEMPTION_IDLE_PROXY,
      ],
      'initialize(address,(address,address),(address,address),(uint256,uint256),address,uint256,uint256,(uint256,uint256,uint256),address,address)',
    );

  // Grant BURN_ROLE to vault
  await accessControl.grantRole(
    allRoles.tokenRoles.mTBILL.burner,
    redemptionVaultWithUSTB.address,
  );

  // Get mainnet contracts
  const usdc = await ethers.getContractAt('IERC20', MAINNET_ADDRESSES.USDC);
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

  // Setup payment token
  await redemptionVaultWithUSTB.connect(owner).addPaymentToken(
    usdc.address,
    usdcDataFeed.address,
    0, // no fee
    true, // is stable
  );

  const ustbOwner = await impersonateAndFundAccount(
    await redemptionIdle.owner(),
  );

  return {
    accessControl,
    mTBILL,
    dataFeed: usdcDataFeed,
    mTokenToUsdDataFeed: mtbillDataFeed,
    mockedAggregator: usdcAggregator,
    mockedAggregatorMToken: mtbillAggregator,
    redemptionVaultWithUSTB,
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
    roles: allRoles,
  };
}

export type DeployedContracts = Awaited<
  ReturnType<typeof ustbRedemptionVaultFixture>
>;
