import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, Contract } from 'ethers';

import { OptionalCommonParams, handleRevert } from './common.helpers';

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
