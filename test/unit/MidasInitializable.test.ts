import { expect } from 'chai';
import { ethers } from 'hardhat';

import { MidasInitializableTester } from '../../typechain-types';
import { deployProxyContract } from '../common/deploy.helpers';

const PROXY_ADMIN_SLOT =
  '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

const INITIALIZED_SLOT = ethers.utils.hexZeroPad('0x00', 32);

const setProxyAdmin = (address: string, admin: string) =>
  ethers.provider.send('hardhat_setStorageAt', [
    address,
    PROXY_ADMIN_SLOT,
    ethers.utils.hexZeroPad(admin, 32),
  ]);

const setInitializedVersion = (address: string, version: number) =>
  ethers.provider.send('hardhat_setStorageAt', [
    address,
    INITIALIZED_SLOT,
    ethers.utils.hexZeroPad(ethers.utils.hexlify(version), 32),
  ]);

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
