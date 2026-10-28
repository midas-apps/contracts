import { setStorageAt } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Contract, ContractFactory, Signer } from 'ethers';
import {
  defaultAbiCoder,
  formatBytes32String,
  hexZeroPad,
  keccak256,
  parseUnits,
} from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';

import { MTokenName } from '../../../config';
import { mTokensMetadata } from '../../../helpers/mtokens-metadata';
import { getAllRoles, prefixes } from '../../../helpers/roles';
import {
  IERC20Metadata,
  MidasAccessControl,
  MidasPauseManager,
  MToken,
} from '../../../typechain-types';

/**
 * V1 vault sources are not part of this branch anymore (see `main`),
 * so legacy vaults are called through a minimal ABI. Every amount
 * passed to V1 vaults uses 18 decimals.
 */
const v1VaultAbi = [
  'function mTokenDataFeed() view returns (address)',
  'function paused() view returns (bool)',
  'function fnPaused(bytes4) view returns (bool)',
  'function pause()',
  'function unpause()',
  'function unpauseFn(bytes4)',
  'function vaultRole() view returns (bytes32)',
  'function feeReceiver() view returns (address)',
  'function instantDailyLimit() view returns (uint256)',
  'function setInstantDailyLimit(uint256)',
  'function isFreeFromMinAmount(address) view returns (bool)',
  'function freeFromMinAmount(address,bool)',
  'function currentRequestId() view returns (uint256)',
  'function approveRequest(uint256,uint256)',
  'function greenlistEnabled() view returns (bool)',
  'function setGreenlistEnable(bool)',
  'function greenlistedRole() view returns (bytes32)',
  'function greenlistTogglerRole() view returns (bytes32)',
  // deposit vault
  'function depositInstant(address,uint256,uint256,bytes32)',
  'function depositRequest(address,uint256,bytes32) returns (uint256)',
  'function mintRequests(uint256) view returns (address sender, address tokenIn, uint8 status, uint256 depositedUsdAmount, uint256 usdAmountWithoutFees, uint256 tokenOutRate)',
  // redemption vault
  'function redeemInstant(address,uint256,uint256)',
  'function redeemRequest(address,uint256) returns (uint256)',
  'function redeemRequests(uint256) view returns (address sender, address tokenOut, uint8 status, uint256 amountMToken, uint256 mTokenRate, uint256 tokenOutRate)',
  'function requestRedeemer() view returns (address)',
  'function liquidityProvider() view returns (address)',
];

const REFERRER_ID = formatBytes32String('v1-compat');

export const V1_REQUEST_PENDING = 0;
export const V1_REQUEST_PROCESSED = 1;

export type V1Vault = {
  name: string;
  isDeposit: boolean;
  contract: Contract;
};

export type V1VaultsContext = {
  mTokenName: MTokenName;
  mToken: MToken;
  accessControl: MidasAccessControl;
  acDefaultAdmin: SignerWithAddress;
  stranger: SignerWithAddress;
  paymentToken: IERC20Metadata;
  holder: SignerWithAddress;
  operator: SignerWithAddress;
  depositAmount: BigNumber;
  redeemAmount: BigNumber;
  vaults: V1Vault[];
};

export type V1Request = { vault: V1Vault; requestId: BigNumber };

/**
 * Rootstock addresses in the config use the EIP-1191 checksum,
 * which ethers rejects
 */
export const normalizeAddress = (address: string) =>
  ethers.utils.getAddress(address.toLowerCase());

export const getV1Vault = (name: string, address: string): V1Vault => ({
  name,
  isDeposit: name.startsWith('depositVault'),
  contract: new Contract(
    normalizeAddress(address),
    v1VaultAbi,
    ethers.provider,
  ),
});

/**
 * Grants `role` from the AccessControl default admin, granting itself
 * the admin role of `role` first when needed. Works on V1 and V2.
 */
export const grantRole = async (
  { accessControl, acDefaultAdmin }: V1VaultsContext,
  role: string,
  account: string,
) => {
  if (await accessControl.hasRole(role, account)) return;

  const adminRole = await accessControl.getRoleAdmin(role);
  if (!(await accessControl.hasRole(adminRole, acDefaultAdmin.address))) {
    await accessControl
      .connect(acDefaultAdmin)
      ['grantRole(bytes32,address)'](adminRole, acDefaultAdmin.address);
  }
  await accessControl
    .connect(acDefaultAdmin)
    ['grantRole(bytes32,address)'](role, account);
};

/**
 * Revokes `role` from the AccessControl default admin
 */
export const revokeRole = async (
  ctx: V1VaultsContext,
  role: string,
  account: string,
) => {
  const { accessControl, acDefaultAdmin } = ctx;
  await grantRole(
    ctx,
    await accessControl.getRoleAdmin(role),
    acDefaultAdmin.address,
  );
  await accessControl.connect(acDefaultAdmin).revokeRole(role, account);
};

/**
 * depositInstant on deposit vaults, redeemInstant on redemption vaults
 */
export const v1UserCall = (
  { holder, paymentToken, depositAmount, redeemAmount }: V1VaultsContext,
  vault: V1Vault,
) =>
  vault.isDeposit
    ? vault.contract
        .connect(holder)
        .depositInstant(paymentToken.address, depositAmount, 0, REFERRER_ID)
    : vault.contract
        .connect(holder)
        .redeemInstant(paymentToken.address, redeemAmount, 0);

const isV2MToken = (mToken: MToken) =>
  mToken
    .isPermissioned()
    .then(() => true)
    .catch(() => false);

const getV1Request = (vault: V1Vault, requestId: BigNumber) =>
  vault.isDeposit
    ? vault.contract.mintRequests(requestId)
    : vault.contract.redeemRequests(requestId);

/**
 * Increases `account` balance of `token` by writing the balance mapping slot,
 * the slot is found by probing
 */
export const dealErc20 = async (
  token: IERC20Metadata,
  account: string,
  amount: BigNumber,
) => {
  const target = (await token.balanceOf(account)).add(amount);

  for (let slot = 0; slot < 100; slot++) {
    const key = keccak256(
      defaultAbiCoder.encode(['address', 'uint256'], [account, slot]),
    );
    const previous = await ethers.provider.getStorageAt(token.address, key);

    await setStorageAt(
      token.address,
      key,
      hexZeroPad(target.toHexString(), 32),
    );
    if ((await token.balanceOf(account)).eq(target)) return;
    await setStorageAt(token.address, key, previous);
  }

  throw new Error(`balance slot not found for ${token.address}`);
};

/**
 * Upgrades a proxy through the OZ plugin. Falls back to a plain ProxyAdmin
 * upgrade when the current implementation is missing from the OZ manifest.
 */
export const upgradeProxy = async (
  proxyAdminOwner: SignerWithAddress,
  proxy: string,
  factory: new (signer: Signer) => ContractFactory,
  constructorArgs: unknown[] = [],
  call?: { fn: string; args: unknown[] },
) => {
  const contractFactory = new factory(proxyAdminOwner);

  try {
    await hre.upgrades.upgradeProxy(proxy, contractFactory, {
      constructorArgs,
      call,
    });
    return;
  } catch (err) {
    if (!/is not registered/.test((err as Error).message)) throw err;
  }

  const implementation = await contractFactory.deploy(...constructorArgs);
  const proxyAdmin = await ethers.getContractAt(
    'ProxyAdmin',
    await hre.upgrades.erc1967.getAdminAddress(proxy),
    proxyAdminOwner,
  );

  if (call) {
    await proxyAdmin.upgradeAndCall(
      proxy,
      implementation.address,
      contractFactory.interface.encodeFunctionData(call.fn, call.args),
    );
  } else {
    await proxyAdmin.upgrade(proxy, implementation.address);
  }
};

/**
 * Makes a production V1 vault usable on the fork: unpauses it, lifts
 * limits and min amounts for the holder and seeds payment token liquidity
 */
export const prepareV1Vault = async (
  { holder, operator, mToken, paymentToken }: V1VaultsContext,
  vault: V1Vault,
  impersonate: (address: string) => Promise<SignerWithAddress>,
) => {
  const admin = vault.contract.connect(operator);
  const liquidity = parseUnits('100000000', await paymentToken.decimals());

  if (await vault.contract.paused()) await admin.unpause();

  const functions = vault.isDeposit
    ? [
        'depositInstant(address,uint256,uint256,bytes32)',
        'depositRequest(address,uint256,bytes32)',
      ]
    : [
        'redeemInstant(address,uint256,uint256)',
        'redeemRequest(address,uint256)',
      ];

  for (const fn of functions) {
    const selector = ethers.utils.id(fn).slice(0, 10);
    if (await vault.contract.fnPaused(selector))
      await admin.unpauseFn(selector);
  }

  await admin.setInstantDailyLimit(ethers.constants.MaxUint256);

  if (!(await vault.contract.isFreeFromMinAmount(holder.address))) {
    await admin.freeFromMinAmount(holder.address, true);
  }

  if (vault.isDeposit) {
    await dealErc20(paymentToken, holder.address, liquidity);
    await paymentToken
      .connect(holder)
      .approve(vault.contract.address, ethers.constants.MaxUint256);
    return;
  }

  await mToken
    .connect(holder)
    .approve(vault.contract.address, ethers.constants.MaxUint256);

  await dealErc20(paymentToken, vault.contract.address, liquidity);

  const requestRedeemer = await impersonate(
    await vault.contract.requestRedeemer(),
  );
  await dealErc20(paymentToken, requestRedeemer.address, liquidity);
  await paymentToken
    .connect(requestRedeemer)
    .approve(vault.contract.address, ethers.constants.MaxUint256);
};

export const depositInstantTest = async (
  { mToken, paymentToken, holder, depositAmount }: V1VaultsContext,
  vault: V1Vault,
) => {
  const mTokenBefore = await mToken.balanceOf(holder.address);
  const paymentBefore = await paymentToken.balanceOf(holder.address);

  await vault.contract
    .connect(holder)
    .depositInstant(paymentToken.address, depositAmount, 0, REFERRER_ID);

  expect(await mToken.balanceOf(holder.address)).gt(mTokenBefore);
  expect(paymentBefore.sub(await paymentToken.balanceOf(holder.address))).eq(
    depositAmount.div(
      BigNumber.from(10).pow(18 - (await paymentToken.decimals())),
    ),
  );
};

export const depositRequestTest = async (
  { paymentToken, holder, depositAmount }: V1VaultsContext,
  vault: V1Vault,
): Promise<V1Request> => {
  const requestId: BigNumber = await vault.contract.currentRequestId();

  await vault.contract
    .connect(holder)
    .depositRequest(paymentToken.address, depositAmount, REFERRER_ID);

  const request = await getV1Request(vault, requestId);
  expect(request.sender).eq(holder.address);
  expect(request.status).eq(V1_REQUEST_PENDING);

  return { vault, requestId };
};

export const redeemInstantTest = async (
  { mToken, paymentToken, holder, redeemAmount }: V1VaultsContext,
  vault: V1Vault,
) => {
  const mTokenBefore = await mToken.balanceOf(holder.address);
  const paymentBefore = await paymentToken.balanceOf(holder.address);

  await vault.contract
    .connect(holder)
    .redeemInstant(paymentToken.address, redeemAmount, 0);

  expect(mTokenBefore.sub(await mToken.balanceOf(holder.address))).eq(
    redeemAmount,
  );
  expect(await paymentToken.balanceOf(holder.address)).gt(paymentBefore);
};

export const redeemRequestTest = async (
  { mToken, paymentToken, holder, redeemAmount }: V1VaultsContext,
  vault: V1Vault,
): Promise<V1Request> => {
  const mTokenBefore = await mToken.balanceOf(holder.address);
  const requestId: BigNumber = await vault.contract.currentRequestId();

  await vault.contract
    .connect(holder)
    .redeemRequest(paymentToken.address, redeemAmount);

  expect(mTokenBefore.sub(await mToken.balanceOf(holder.address))).eq(
    redeemAmount,
  );

  const request = await getV1Request(vault, requestId);
  expect(request.sender).eq(holder.address);
  expect(request.status).eq(V1_REQUEST_PENDING);

  return { vault, requestId };
};

/**
 * Approves a V1 request at the current mToken rate. Redemption requests
 * burn the mTokens held by the vault.
 */
export const approveRequestTest = async (
  { mToken, paymentToken, holder, operator }: V1VaultsContext,
  { vault, requestId }: V1Request,
) => {
  const request = await getV1Request(vault, requestId);
  const payoutToken = vault.isDeposit ? mToken : paymentToken;
  const payoutBefore = await payoutToken.balanceOf(holder.address);
  const vaultMTokenBefore = await mToken.balanceOf(vault.contract.address);

  const rate = await (
    await ethers.getContractAt(
      'DataFeed',
      await vault.contract.mTokenDataFeed(),
    )
  ).getDataInBase18();

  await vault.contract.connect(operator).approveRequest(requestId, rate);

  expect((await getV1Request(vault, requestId)).status).eq(
    V1_REQUEST_PROCESSED,
  );
  expect(await payoutToken.balanceOf(holder.address)).gt(payoutBefore);

  if (!vault.isDeposit) {
    expect(
      vaultMTokenBefore.sub(await mToken.balanceOf(vault.contract.address)),
    ).eq(request.amountMToken);
  }
};

/**
 * depositInstant -> depositRequest on deposit vaults, then
 * redeemInstant -> redeemRequest on redemption vaults.
 * Returns the created requests, left pending.
 */
export const v1VaultsFlowTest = async (ctx: V1VaultsContext) => {
  const requests: V1Request[] = [];

  for (const vault of ctx.vaults.filter((v) => v.isDeposit)) {
    await depositInstantTest(ctx, vault);
    requests.push(await depositRequestTest(ctx, vault));
  }

  for (const vault of ctx.vaults.filter((v) => !v.isDeposit)) {
    await redeemInstantTest(ctx, vault);
    requests.push(await redeemRequestTest(ctx, vault));
  }

  return requests;
};

/**
 * V1 vaults resolve permissions with `accessControl.hasRole`: role holders
 * keep access, other accounts are rejected, and the V1 pause still works
 */
export const v1VaultPermissionsTest = async (ctx: V1VaultsContext) => {
  const { operator, stranger } = ctx;

  for (const vault of ctx.vaults) {
    await expect(vault.contract.connect(stranger).pause()).revertedWith(
      'WMAC: hasnt role',
    );
    await expect(
      vault.contract.connect(stranger).approveRequest(0, parseUnits('1')),
    ).revertedWith('WMAC: hasnt role');

    await vault.contract.connect(operator).pause();
    await expect(v1UserCall(ctx, vault)).revertedWith('Pausable: paused');
    await vault.contract.connect(operator).unpause();
  }
};

/**
 * V1 vault greenlist reads the greenlisted role from AccessControl.
 * Greenlist is enabled on vaults that have it disabled for the check.
 * For permissioned mTokens the token level greenlist is checked as well.
 */
export const v1GreenlistTest = async (ctx: V1VaultsContext) => {
  const { accessControl, holder, operator, stranger, mToken } = ctx;

  for (const vault of ctx.vaults) {
    const role = await vault.contract.greenlistedRole();
    const wasEnabled = await vault.contract.greenlistEnabled();
    const wasGreenlisted = await accessControl.hasRole(role, holder.address);

    if (!wasEnabled) {
      await grantRole(
        ctx,
        await vault.contract.greenlistTogglerRole(),
        operator.address,
      );
      await vault.contract.connect(operator).setGreenlistEnable(true);
    }
    if (wasGreenlisted) await revokeRole(ctx, role, holder.address);

    await expect(v1UserCall(ctx, vault)).revertedWith('WMAC: hasnt role');

    if (wasGreenlisted) await grantRole(ctx, role, holder.address);
    if (!wasEnabled) {
      await vault.contract.connect(operator).setGreenlistEnable(false);
    }
  }

  if (mTokensMetadata[ctx.mTokenName].isPermissioned) {
    // stranger is not greenlisted
    await expect(
      mToken.connect(holder).transfer(stranger.address, ctx.redeemAmount),
    ).reverted;
  }
};

/**
 * Blacklisted holder is rejected by V1 vaults and by the mToken
 */
export const v1BlacklistTest = async (ctx: V1VaultsContext) => {
  const { holder, operator, mToken } = ctx;
  const blacklisted = getAllRoles().common.blacklisted;

  await grantRole(ctx, blacklisted, holder.address);

  for (const vault of ctx.vaults) {
    await expect(v1UserCall(ctx, vault)).revertedWith('WMAC: has role');
  }
  await expect(mToken.connect(holder).transfer(operator.address, 1)).reverted;

  await revokeRole(ctx, blacklisted, holder.address);
};

/**
 * mToken level pause blocks V1 vaults. V1 tokens are paused with their own
 * pause() and ignore PauseManager, V2 tokens are paused through PauseManager.
 */
export const mTokenPauseTest = async (
  ctx: V1VaultsContext,
  pauseManager?: MidasPauseManager,
) => {
  const { mToken, operator } = ctx;

  if (await isV2MToken(mToken)) {
    await pauseManager!.connect(operator).bulkPauseContract([mToken.address]);
    for (const vault of ctx.vaults) {
      await expect(v1UserCall(ctx, vault)).revertedWithCustomError(
        mToken,
        'Paused',
      );
    }
    await pauseManager!.connect(operator).bulkUnpauseContract([mToken.address]);
    return;
  }

  const v1MToken = new Contract(
    mToken.address,
    ['function pause()', 'function unpause()'],
    operator,
  );
  await grantRole(
    ctx,
    ethers.utils.id(`${prefixes[ctx.mTokenName]}_PAUSE_OPERATOR_ROLE`),
    operator.address,
  );

  await v1MToken.pause();
  for (const vault of ctx.vaults) {
    await expect(v1UserCall(ctx, vault)).revertedWith(
      'ERC20Pausable: token transfer while paused',
    );
  }
  await v1MToken.unpause();

  if (pauseManager) {
    // V1 mToken does not read PauseManager
    await pauseManager.connect(operator).bulkPauseContract([mToken.address]);
    const vault = ctx.vaults.find((v) => v.isDeposit) ?? ctx.vaults[0];
    await v1UserCall(ctx, vault);
    await pauseManager.connect(operator).bulkUnpauseContract([mToken.address]);
  }
};
