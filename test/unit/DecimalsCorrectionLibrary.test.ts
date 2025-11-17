import { expect } from 'chai';
import { BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

import {
  DecimalsCorrectionTester,
  DecimalsCorrectionTester__factory,
} from '../../typechain-types';

describe('DecimalsCorrectionLibrary', function () {
  let decimalsCorrection: DecimalsCorrectionTester;

  before(async () => {
    const [signer] = await ethers.getSigners();
    decimalsCorrection = await new DecimalsCorrectionTester__factory(
      signer,
    ).deploy();
  });

  const convertFromBase18Test = async (
    amountIn: string,
    decimals: BigNumberish,
  ) => {
    const expectedAmountOut = parseUnits(amountIn.toString(), decimals);

    const res = await decimalsCorrection.convertAmountFromBase18Public(
      parseUnits(amountIn.toString()),
      decimals,
    );

    expect(res).eq(expectedAmountOut);
  };

  const convertToBase18Test = async (
    amountIn: string,
    decimals: BigNumberish,
  ) => {
    const expectedAmountOut = parseUnits(amountIn.toString());

    const res = await decimalsCorrection.convertAmountToBase18Public(
      parseUnits(amountIn.toString(), decimals),
      decimals,
    );

    expect(res).eq(expectedAmountOut);
  };

  describe('convertFromBase18()', () => {
    it('decimal < 18: Amount - 0, decimals - 0, expected out - (0,0)', async () => {
      await convertFromBase18Test('0', '0');
    });

    it('decimal < 18: Amount - 0, decimals - 9, expected out - (0,0)', async () => {
      await convertFromBase18Test('0', '0');
    });

    it('decimal < 18: Amount - 1, decimals - 9, expected out - (1,9)', async () => {
      await convertFromBase18Test('1', '9');
    });

    it('decimal > 18: Amount - 1, decimals - 27, expected out - (1,27)', async () => {
      await convertFromBase18Test('1', '27');
    });

    it('decimal == 18: Amount - 1, decimals - 18, expected out - (1,18)', async () => {
      await convertFromBase18Test('1', '18');
    });

    it('decimal > 18: Amount - 0, decimals - 27, expected out - (0,0)', async () => {
      await convertFromBase18Test('0', '27');
    });
  });

  describe('convertToBase18()', () => {
    it('decimal < 18: Amount - 0, decimals - 0, expected out - (0,0)', async () => {
      await convertToBase18Test('0', '0');
    });

    it('decimal < 18: Amount - 0, decimals - 9, expected out - (0,0)', async () => {
      await convertToBase18Test('0', '0');
    });

    it('decimal == 18: Amount - 1, decimals - 18, expected out - (1,18)', async () => {
      await convertToBase18Test('1', '18');
    });

    it('decimal < 18: Amount - 1, decimals - 9, expected out - (1,18)', async () => {
      await convertToBase18Test('1', '9');
    });

    it('decimal > 18: Amount - 1, decimals - 27, expected out - (1,18)', async () => {
      await convertToBase18Test('1', '27');
    });

    it('decimal > 18: Amount - 0, decimals - 27, expected out - (0,0)', async () => {
      await convertToBase18Test('0', '27');
    });
  });
});
