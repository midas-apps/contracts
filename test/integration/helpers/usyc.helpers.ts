import { mine } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, Contract } from 'ethers';
import { ethers, network } from 'hardhat';

import { impersonateAndFundAccount, resetFork } from './fork.helpers';

import { rpcUrls } from '../../../config';
import {
  ArcUSDCMock,
  IUSYCTeller,
  IUSYCTeller__factory,
} from '../../../typechain-types';

/**
 * Circle USYC contracts on Arc mainnet
 * https://developers.circle.com/tokenized/usyc/smart-contracts
 */
export const ARC_ADDRESSES = {
  USYC_TELLER: '0x51A8CE47dC08ba5CD19c7aa84EA6fD6664f60f9b',
  USYC: '0x8a5D989Bbb96929F689B0200f435f53dA42bF490',
  USYC_ENTITLEMENTS: '0xb69ecb156Dc0028198028c501340d5367845ca72',
  // holder of the RolesAuthority admin role (255), allowed to `setUserRole`
  USYC_ENTITLEMENTS_ADMIN: '0xDbE01f447040F78ccbC8Dfd101BEc1a2C21f800D',
  // `teller.asset()`
  USDC: '0x3600000000000000000000000000000000000000',
} as const;

/** RolesAuthority role granting Teller deposit/redeem and USYC transfers */
export const USYC_INVESTOR_ROLE = 0;

export const ARC_FORK_BLOCK = 29334300;

/**
 * Teller members not part of `IUSYCTeller`: the liquidity view the strategy
 * requirement refers to, and the error the Teller reverts with for accounts
 * not entitled by Circle (selector 0x7f63bd0f, verified on the fork)
 */
const TELLER_EXTRA_ABI = [
  'function totalAssets() view returns (uint256)',
  'function convertToShares(uint256) view returns (uint256)',
  'error NotPermissioned()',
];

export const NOT_PERMISSIONED_SELECTOR = '0x7f63bd0f';

export const getTellerExtras = () =>
  new Contract(ARC_ADDRESSES.USYC_TELLER, TELLER_EXTRA_ABI, ethers.provider);

const ENTITLEMENTS_ABI = [
  'function setUserRole(address,uint8,bool)',
  'function canCall(address,address,bytes4) view returns (bool)',
];

/**
 * Forks Arc and makes the fork usable:
 * - mines a block, as hardhat has no hardfork history for Arc (chain 5042)
 *   and refuses to execute calls at the fork block itself
 * - replaces Arc USDC code with an ERC20 mock: Arc USDC moves native balances
 *   through an Arc-only precompile (0x1800...00) that hardhat does not have.
 *   The Teller, USYC, entitlements and oracle stay real.
 */
export const resetArcFork = async () => {
  await resetFork(rpcUrls.arc, ARC_FORK_BLOCK);
  await mine(1);

  const usdcImpl = await (
    await ethers.getContractFactory('ArcUSDCMock')
  ).deploy();
  await network.provider.send('hardhat_setCode', [
    ARC_ADDRESSES.USDC,
    await ethers.provider.getCode(usdcImpl.address),
  ]);

  const usdc = (await ethers.getContractAt(
    'ArcUSDCMock',
    ARC_ADDRESSES.USDC,
  )) as ArcUSDCMock;
  const teller = IUSYCTeller__factory.connect(
    ARC_ADDRESSES.USYC_TELLER,
    ethers.provider,
  );
  const usyc = await ethers.getContractAt('IERC20Metadata', ARC_ADDRESSES.USYC);
  const entitlements = new Contract(
    ARC_ADDRESSES.USYC_ENTITLEMENTS,
    ENTITLEMENTS_ABI,
    await impersonateAndFundAccount(ARC_ADDRESSES.USYC_ENTITLEMENTS_ADMIN),
  );

  return { usdc, teller, usyc, entitlements };
};

/**
 * Onboards `account` with Circle the same way Circle does it in production
 */
export const setUsycEntitlement = async (
  entitlements: Contract,
  account: string,
  enabled = true,
) => {
  await (
    await entitlements.setUserRole(account, USYC_INVESTOR_ROLE, enabled)
  ).wait();
};

/**
 * Sets the redemption liquidity the Teller can pay out. On Arc the Teller
 * pulls USDC from the treasury, so liquidity = min(balance, allowance).
 * The USDC code swap wipes the original allowance, so it is restored here.
 */
export const setTellerLiquidity = async (
  teller: IUSYCTeller,
  usdc: ArcUSDCMock,
  redeemer: string,
  liquidity: BigNumber,
) => {
  const treasury = await teller.treasury(redeemer);
  const treasurySigner = await impersonateAndFundAccount(treasury);

  const balance = await usdc.balanceOf(treasury);
  if (balance.lt(liquidity)) {
    await usdc.mint(treasury, liquidity.sub(balance));
  }
  await (
    await usdc.connect(treasurySigner).approve(teller.address, liquidity)
  ).wait();

  return treasury;
};
