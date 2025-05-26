import { MTokenNameEnum } from '../../config';
import { tokenContractsTests } from '../common/token.tests';

const mProducts = Object.values(MTokenNameEnum);

describe('Token contracts', () => {
  mProducts.forEach((product) => {
    describe(`${product}`, () => {
      tokenContractsTests(product);
    });
  });
});
