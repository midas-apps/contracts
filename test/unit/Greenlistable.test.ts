import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { encodeFnSelector } from '../../helpers/utils';
import { GreenlistableTester__factory } from '../../typechain-types';
import {
  acErrors,
  greenList,
  greenListToggler,
  setFunctionPermissionTester,
  setupFunctionAccessGrantOperator,
  unGreenList,
} from '../common/ac.helpers';
import { defaultDeploy } from '../common/fixtures';
import { greenListEnable } from '../common/greenlist.helpers';

describe('Greenlistable', function () {
  it('deployment', async () => {
    const { accessControl, greenListableTester, roles } = await loadFixture(
      defaultDeploy,
    );

    expect(
      await accessControl.hasRole(
        roles.common.greenlistedOperator,
        greenListableTester.address,
      ),
    ).eq(true);
  });

  it('onlyInitializing', async () => {
    const { owner, accessControl } = await loadFixture(defaultDeploy);

    const greenListable = await new GreenlistableTester__factory(
      owner,
    ).deploy();

    await expect(
      greenListable.initializeWithoutInitializer(accessControl.address),
    ).revertedWith('Initializable: contract is not initializing');
  });

  it('onlyInitializing unchained', async () => {
    const { owner } = await loadFixture(defaultDeploy);

    const greenListable = await new GreenlistableTester__factory(
      owner,
    ).deploy();

    await expect(
      greenListable.initializeUnchainedWithoutInitializer(),
    ).revertedWith('Initializable: contract is not initializing');
  });

  describe('modifier onlyGreenlisted', () => {
    it('should fail: call from greenlisted user', async () => {
      const { greenListableTester, regularAccounts, owner } = await loadFixture(
        defaultDeploy,
      );

      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        true,
      );

      await expect(
        greenListableTester.onlyGreenlistedTester(regularAccounts[0].address),
      ).revertedWithCustomError(
        greenListableTester,
        acErrors.WMAC_HASNT_ROLE().customErrorName,
      );
    });

    it('call from not greenlisted user', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await greenList(
        {
          greenlistable: greenListableTester,
          accessControl,
          owner,
          role: await greenListableTester.greenlistAdminRole(),
        },
        regularAccounts[0],
      );
      await expect(
        greenListableTester.onlyGreenlistedTester(regularAccounts[0].address),
      ).not.reverted;
    });
  });

  describe('modifier onlyGreenlistToggler', () => {
    it('should fail: call from not greenlistToggler user', async () => {
      const { greenListableTester, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await expect(
        greenListableTester.validateGreenlistableAdminAccess(
          regularAccounts[0].address,
        ),
      ).revertedWithCustomError(
        greenListableTester,
        acErrors.WMAC_HASNT_PERMISSION().customErrorName,
      );
    });

    it('call from  greenlistToggler user', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await greenListToggler(
        {
          greenlistable: greenListableTester,
          accessControl,
          owner,
          role: await greenListableTester.greenlistAdminRole(),
        },
        regularAccounts[0],
      );
      await expect(
        greenListableTester.validateGreenlistableAdminAccess(
          regularAccounts[0].address,
        ),
      ).not.reverted;
    });
  });

  describe('setGreenlistEnable()', () => {
    it('should fail: call from user without GREENLIST_TOGGLER_ROLE role', async () => {
      const { greenListableTester, owner, regularAccounts } = await loadFixture(
        defaultDeploy,
      );

      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        true,
        {
          from: regularAccounts[0],
          revertCustomError: acErrors.WMAC_HASNT_PERMISSION(),
        },
      );
    });

    it('should fail: call from user with GREENLIST_TOGGLER_ROLE role, but send same status', async () => {
      const { greenListableTester, owner } = await loadFixture(defaultDeploy);

      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        false,
        {
          revertCustomError: {
            customErrorName: 'SameBoolValue',
          },
        },
      );
    });

    it('call from user with GREENLIST_TOGGLER_ROLE role', async () => {
      const { greenListableTester, owner } = await loadFixture(defaultDeploy);
      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        true,
      );
    });

    it('succeeds with only scoped function permission', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const greenlistAdmin = await greenListableTester.greenlistAdminRole();
      const selector = encodeFnSelector('setGreenlistEnable(bool)');

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: greenlistAdmin,
        targetContract: greenListableTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      const user = regularAccounts[0];
      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: greenlistAdmin,
          targetContract: greenListableTester.address,
          functionSelector: selector,
          account: user.address,
          enabled: true,
        },
      ]);

      expect(await accessControl.hasRole(greenlistAdmin, user.address)).eq(
        false,
      );

      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        true,
        { from: user },
      );
    });

    it('succeeds with scoped permission and greenlist admin role', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      const greenlistAdmin = await greenListableTester.greenlistAdminRole();
      const selector = encodeFnSelector('setGreenlistEnable(bool)');
      const user = regularAccounts[0];

      await setupFunctionAccessGrantOperator({
        accessControl,
        owner,
        functionAccessAdminRole: greenlistAdmin,
        targetContract: greenListableTester.address,
        functionSelector: selector,
        grantOperator: owner,
      });

      await setFunctionPermissionTester({ accessControl, owner }, [
        {
          functionAccessAdminRole: greenlistAdmin,
          targetContract: greenListableTester.address,
          functionSelector: selector,
          account: user.address,
          enabled: true,
        },
      ]);

      await accessControl.grantRole(greenlistAdmin, user.address);

      expect(await accessControl.hasRole(greenlistAdmin, user.address)).eq(
        true,
      );

      await greenListEnable(
        { greenlistable: greenListableTester, owner },
        true,
        {
          from: user,
        },
      );
    });
  });

  describe('addToGreenList', () => {
    it('should fail: call from user without GREENLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await greenList(
        {
          greenlistable: greenListableTester,
          accessControl,
          owner,
          role: await greenListableTester.greenlistedRole(),
        },
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.GREENLIST_OPERATOR_ROLE()}`,
        },
      );
    });

    it('call from user with GREENLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);
      await greenList(
        {
          greenlistable: greenListableTester,
          accessControl,
          owner,
          role: await greenListableTester.greenlistedRole(),
        },
        regularAccounts[0],
      );
    });
  });

  describe('removeFromGreenList', () => {
    it('should fail: call from user without GREENLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);

      await unGreenList(
        {
          greenlistable: greenListableTester,
          accessControl,
          owner,
          role: await greenListableTester.greenlistedRole(),
        },
        regularAccounts[0],
        {
          from: regularAccounts[0],
          revertMessage: `AccessControl: account ${regularAccounts[0].address.toLowerCase()} is missing role ${await accessControl.GREENLIST_OPERATOR_ROLE()}`,
        },
      );
    });

    it('call from user with GREENLIST_OPERATOR_ROLE role', async () => {
      const { accessControl, greenListableTester, owner, regularAccounts } =
        await loadFixture(defaultDeploy);
      await unGreenList(
        {
          greenlistable: greenListableTester,
          accessControl,
          owner,
          role: await greenListableTester.greenlistAdminRole(),
        },
        regularAccounts[0],
      );
    });
  });
});
