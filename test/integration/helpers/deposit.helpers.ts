import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, constants } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

import {
  DepositVaultWithAaveTest,
  DepositVaultWithMorphoTest,
  IERC20,
  IERC20Metadata,
  IMToken,
} from '../../../typechain-types';
import { approveBase18 } from '../../common/common.helpers';

type DepositInstantAaveParams = {
  depositVault: DepositVaultWithAaveTest;
  user: SignerWithAddress;
  usdc: IERC20Metadata;
  aUsdc: IERC20;
  mToken: IMToken;
  tokensReceiverAddress: string;
  usdcWhale: SignerWithAddress;
  amountUsd: number;
};

type DepositInstantMorphoParams = {
  depositVault: DepositVaultWithMorphoTest;
  user: SignerWithAddress;
  usdc: IERC20Metadata;
  morphoVault: IERC20;
  mToken: IMToken;
  tokensReceiverAddress: string;
  usdcWhale: SignerWithAddress;
  amountUsd: number;
};

type DepositResult = {
  userMTokenReceived: BigNumber;
  receiverReceiptTokenReceived: BigNumber;
  receiverUsdcReceived: BigNumber;
};

export async function depositInstantAave({
  depositVault,
  user,
  usdc,
  aUsdc,
  mToken,
  tokensReceiverAddress,
  usdcWhale,
  amountUsd,
}: DepositInstantAaveParams): Promise<DepositResult> {
  await usdc
    .connect(usdcWhale)
    .transfer(user.address, parseUnits(String(amountUsd), 6));
  await approveBase18(user, usdc, depositVault, amountUsd);

  const receiverUsdcBefore = await usdc.balanceOf(tokensReceiverAddress);
  const receiverAUsdcBefore = await aUsdc.balanceOf(tokensReceiverAddress);
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
  const receiverAUsdcAfter = await aUsdc.balanceOf(tokensReceiverAddress);
  const userMTokenAfter = await mToken.balanceOf(user.address);

  return {
    userMTokenReceived: userMTokenAfter.sub(userMTokenBefore),
    receiverReceiptTokenReceived: receiverAUsdcAfter.sub(receiverAUsdcBefore),
    receiverUsdcReceived: receiverUsdcAfter.sub(receiverUsdcBefore),
  };
}

export async function depositInstantMorpho({
  depositVault,
  user,
  usdc,
  morphoVault,
  mToken,
  tokensReceiverAddress,
  usdcWhale,
  amountUsd,
}: DepositInstantMorphoParams): Promise<DepositResult> {
  await usdc
    .connect(usdcWhale)
    .transfer(user.address, parseUnits(String(amountUsd), 6));
  await approveBase18(user, usdc, depositVault, amountUsd);

  const receiverUsdcBefore = await usdc.balanceOf(tokensReceiverAddress);
  const receiverSharesBefore = await morphoVault.balanceOf(
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
  const receiverSharesAfter = await morphoVault.balanceOf(
    tokensReceiverAddress,
  );
  const userMTokenAfter = await mToken.balanceOf(user.address);

  return {
    userMTokenReceived: userMTokenAfter.sub(userMTokenBefore),
    receiverReceiptTokenReceived: receiverSharesAfter.sub(receiverSharesBefore),
    receiverUsdcReceived: receiverUsdcAfter.sub(receiverUsdcBefore),
  };
}

export function assertAutoInvestEnabled(result: DepositResult) {
  expect(result.receiverReceiptTokenReceived).to.be.gt(
    0,
    'tokensReceiver should have received receipt tokens',
  );
  expect(result.receiverUsdcReceived).to.equal(
    0,
    'tokensReceiver raw USDC should not change when auto-invest is on',
  );
  expect(result.userMTokenReceived).to.be.gt(
    0,
    'user should have received mToken',
  );
}

export function assertAutoInvestDisabled(result: DepositResult) {
  expect(result.receiverUsdcReceived).to.be.gt(
    0,
    'tokensReceiver should have received USDC',
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
