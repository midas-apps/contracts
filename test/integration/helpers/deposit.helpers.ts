import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  DepositVaultWithAaveTest,
  DepositVaultWithMorphoTest,
  DepositVaultWithMTokenTest,
  IERC20,
  IERC20Metadata,
  IMToken,
} from '../../../typechain-types';
import { approveBase18 } from '../../common/common.helpers';

type DepositInstantAaveParams = {
  depositVault: DepositVaultWithAaveTest;
  user: SignerWithAddress;
  tokenIn: IERC20Metadata;
  receiptToken: IERC20;
  mToken: IMToken;
  tokensReceiverAddress: string;
  tokenWhale: SignerWithAddress;
  amountUsd: number;
  tokenDecimals?: number;
};

type DepositInstantMorphoParams = {
  depositVault: DepositVaultWithMorphoTest;
  user: SignerWithAddress;
  tokenIn: IERC20Metadata;
  receiptToken: IERC20;
  mToken: IMToken;
  tokensReceiverAddress: string;
  tokenWhale: SignerWithAddress;
  amountUsd: number;
  tokenDecimals?: number;
};

type DepositResult = {
  userMTokenReceived: BigNumber;
  receiverReceiptTokenReceived: BigNumber;
  receiverTokenReceived: BigNumber;
};

export async function depositInstantAave({
  depositVault,
  user,
  tokenIn,
  receiptToken,
  mToken,
  tokensReceiverAddress,
  tokenWhale,
  amountUsd,
  tokenDecimals,
}: DepositInstantAaveParams): Promise<DepositResult> {
  const decimals = tokenDecimals ?? 6;
  await tokenIn
    .connect(tokenWhale)
    .transfer(user.address, parseUnits(String(amountUsd), decimals));
  await approveBase18(user, tokenIn, depositVault, amountUsd);

  const receiverTokenBefore = await tokenIn.balanceOf(tokensReceiverAddress);
  const receiverReceiptBefore = await receiptToken.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenBefore = await mToken.balanceOf(user.address);

  await depositVault
    .connect(user)
    ['depositInstant(address,uint256,uint256,bytes32)'](
      tokenIn.address,
      parseUnits(String(amountUsd)),
      constants.Zero,
      constants.HashZero,
    );

  const receiverTokenAfter = await tokenIn.balanceOf(tokensReceiverAddress);
  const receiverReceiptAfter = await receiptToken.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenAfter = await mToken.balanceOf(user.address);

  return {
    userMTokenReceived: userMTokenAfter.sub(userMTokenBefore),
    receiverReceiptTokenReceived: receiverReceiptAfter.sub(
      receiverReceiptBefore,
    ),
    receiverTokenReceived: receiverTokenAfter.sub(receiverTokenBefore),
  };
}

export async function depositInstantMorpho({
  depositVault,
  user,
  tokenIn,
  receiptToken,
  mToken,
  tokensReceiverAddress,
  tokenWhale,
  amountUsd,
  tokenDecimals,
}: DepositInstantMorphoParams): Promise<DepositResult> {
  const decimals = tokenDecimals ?? 6;
  await tokenIn
    .connect(tokenWhale)
    .transfer(user.address, parseUnits(String(amountUsd), decimals));
  await approveBase18(user, tokenIn, depositVault, amountUsd);

  const receiverTokenBefore = await tokenIn.balanceOf(tokensReceiverAddress);
  const receiverReceiptBefore = await receiptToken.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenBefore = await mToken.balanceOf(user.address);

  await depositVault
    .connect(user)
    ['depositInstant(address,uint256,uint256,bytes32)'](
      tokenIn.address,
      parseUnits(String(amountUsd)),
      constants.Zero,
      constants.HashZero,
    );

  const receiverTokenAfter = await tokenIn.balanceOf(tokensReceiverAddress);
  const receiverReceiptAfter = await receiptToken.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenAfter = await mToken.balanceOf(user.address);

  return {
    userMTokenReceived: userMTokenAfter.sub(userMTokenBefore),
    receiverReceiptTokenReceived: receiverReceiptAfter.sub(
      receiverReceiptBefore,
    ),
    receiverTokenReceived: receiverTokenAfter.sub(receiverTokenBefore),
  };
}

type DepositInstantMTokenParams = {
  depositVault: DepositVaultWithMTokenTest;
  user: SignerWithAddress;
  usdc: IERC20Metadata;
  targetMToken: IERC20;
  mToken: IMToken;
  tokensReceiverAddress: string;
  usdcWhale: SignerWithAddress;
  amountUsd: number;
};

export async function depositInstantMToken({
  depositVault,
  user,
  usdc,
  targetMToken,
  mToken,
  tokensReceiverAddress,
  usdcWhale,
  amountUsd,
}: DepositInstantMTokenParams): Promise<DepositResult> {
  await usdc
    .connect(usdcWhale)
    .transfer(user.address, parseUnits(String(amountUsd), 6));
  await approveBase18(user, usdc, depositVault, amountUsd);

  const receiverUsdcBefore = await usdc.balanceOf(tokensReceiverAddress);
  const receiverMTokenBefore = await targetMToken.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenBefore = await mToken.balanceOf(user.address);

  await depositVault
    .connect(user)
    ['depositInstant(address,uint256,uint256,bytes32)'](
      usdc.address,
      parseUnits(String(amountUsd)),
      constants.Zero,
      constants.HashZero,
    );

  const receiverUsdcAfter = await usdc.balanceOf(tokensReceiverAddress);
  const receiverMTokenAfter = await targetMToken.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenAfter = await mToken.balanceOf(user.address);

  return {
    userMTokenReceived: userMTokenAfter.sub(userMTokenBefore),
    receiverReceiptTokenReceived: receiverMTokenAfter.sub(receiverMTokenBefore),
    receiverTokenReceived: receiverUsdcAfter.sub(receiverUsdcBefore),
  };
}

export function assertAutoInvestEnabled(result: DepositResult) {
  expect(result.receiverReceiptTokenReceived).to.be.gt(
    0,
    'tokensReceiver should have received receipt tokens',
  );
  expect(result.receiverTokenReceived).to.equal(
    0,
    'tokensReceiver raw token should not change when auto-invest is on',
  );
  expect(result.userMTokenReceived).to.be.gt(
    0,
    'user should have received mToken',
  );
}

export function assertAutoInvestDisabled(result: DepositResult) {
  expect(result.receiverTokenReceived).to.be.gt(
    0,
    'tokensReceiver should have received token',
  );
  expect(result.receiverReceiptTokenReceived).to.be.lte(
    1,
    'tokensReceiver should not receive new receipt tokens when auto-invest is off',
  );
  expect(result.userMTokenReceived).to.be.gt(
    0,
    'user should have received mToken',
  );
}
