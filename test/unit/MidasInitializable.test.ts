import { expect } from 'chai';
import { ethers } from 'hardhat';

import { MidasInitializableTester } from '../../typechain-types';
import {
  deployProxyContract,
  setInitializedVersion,
  setProxyAdmin,
} from '../common/deploy.helpers';

const deployTester = () =>
  deployProxyContract<MidasInitializableTester>(
    'MidasInitializableTester',
    [],
    'initialize',
  );

describe('MidasInitializable', function () {
  it('fresh deploy: initialize runs initializeV2 while proxy admin is zero', async () => {
    const tester = await deployTester();

    expect(await tester.initializeCallsCount()).eq(1);
    expect(await tester.reinitCallsCount()).eq(1);
  });

  describe('initializeV2()', () => {
    it('should fail: when already reinitialized, even from the proxy admin', async () => {
      const [, admin, stranger] = await ethers.getSigners();
      const tester = await deployTester();

      await setProxyAdmin(tester.address, admin.address);

      await expect(tester.connect(admin).initializeV2()).revertedWith(
        'Initializable: contract is already initialized',
      );
      await expect(tester.connect(stranger).initializeV2()).revertedWith(
        'Initializable: contract is already initialized',
      );
    });

    it('should fail: when initialized and caller is not the proxy admin', async () => {
      const [, admin, stranger] = await ethers.getSigners();
      const tester = await deployTester();

      await setProxyAdmin(tester.address, admin.address);
      await setInitializedVersion(tester.address, 1);

      await expect(
        tester.connect(stranger).initializeV2(),
      ).revertedWithCustomError(tester, 'SenderNotProxyAdmin');
    });

    it('when initialized and caller is the proxy admin', async () => {
      const [, admin] = await ethers.getSigners();
      const tester = await deployTester();

      await setProxyAdmin(tester.address, admin.address);
      await setInitializedVersion(tester.address, 1);

      await tester.connect(admin).initializeV2();

      expect(await tester.reinitCallsCount()).eq(2);
    });
  });
});
