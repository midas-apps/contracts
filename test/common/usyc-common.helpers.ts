import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract } from 'ethers';

import { OptionalCommonParams, handleRevert } from './common.helpers';

/** Teller fee rate units: 1e18 = 1% */
export const USYC_HUNDRED_PCT = BigNumber.from(10).pow(20);

/**
 * Maximum Teller fee taken from `gross` at `feeRate`, rounded up,
 * mirrors `VaultsWithUSYCLibrary.maxFee`
 */
export const usycMaxFee = (gross: BigNumber, feeRate: BigNumberish) => {
  const denominator = USYC_HUNDRED_PCT.add(feeRate);
  const product = gross.mul(feeRate);
  const fee = product.div(denominator);
  return product.mod(denominator).isZero() ? fee : fee.add(1);
};

/**
 * Generic admin setter test shared by the USYC deposit and redemption vaults:
 * checks access, emitted event and stored value
 */
export const usycSetterTest = async <TValue extends BigNumberish | boolean>(
  { vault, owner }: { vault: Contract; owner: SignerWithAddress },
  setter: string,
  event: string,
  getter: string,
  value: TValue,
  opt?: OptionalCommonParams,
) => {
  const callFn = () => vault.connect(opt?.from ?? owner)[setter](value);

  if (await handleRevert(callFn, vault, opt)) {
    return;
  }

  await expect(callFn())
    .to.emit(vault, vault.interface.getEvent(event).name)
    .withArgs(value).to.not.reverted;

  const stored = await vault[getter]();
  if (typeof value === 'boolean') {
    expect(stored).eq(value);
  } else if (typeof value === 'string' && value.startsWith('0x')) {
    expect(stored).eq(value);
  } else {
    expect(stored).eq(BigNumber.from(value));
  }
};

type UsycVaultsPair = {
  depositVaultWithUSYC: Contract;
  redemptionVaultWithUSYC: Contract;
  owner: SignerWithAddress;
};

/**
 * Sets `anticipatedFeeRate` of both paired USYC vaults: the subscription fee
 * rate on the deposit vault and the redemption fee rate on the redemption
 * vault. Each vault validates its own rate and the rate of its paired vault,
 * so USYC is only used when both match the Teller
 */
export const setUsycAnticipatedFeeRatesTest = async (
  { depositVaultWithUSYC, redemptionVaultWithUSYC, owner }: UsycVaultsPair,
  subscriptionFeeRate: BigNumberish,
  redemptionFeeRate: BigNumberish,
) => {
  await usycSetterTest(
    { vault: depositVaultWithUSYC, owner },
    'setAnticipatedFeeRate',
    'SetAnticipatedFeeRate',
    'anticipatedFeeRate',
    subscriptionFeeRate,
  );
  await usycSetterTest(
    { vault: redemptionVaultWithUSYC, owner },
    'setAnticipatedFeeRate',
    'SetAnticipatedFeeRate',
    'anticipatedFeeRate',
    redemptionFeeRate,
  );
};
