import { tokenContractsTests } from './common/token.tests';

import { MTokenNameEnum } from '../config';

const mProducts = Object.values(MTokenNameEnum);

describe('Token contracts', () => {
  mProducts.forEach((product) => {
    describe(`${product}`, () => {
      tokenContractsTests(product);
    });
  });
});
