import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { mTokenContractsSuits } from './suits/mtoken.suits';

import { MTokenName } from '../../config';
import { acErrors, blackList } from '../common/ac.helpers';
import { defaultDeploy, mTokenPermissionedFixture } from '../common/fixtures';
import { burn, mint } from '../common/mTBILL.helpers';

const mProducts = ['mTBILL'] as MTokenName[]; // Object.values(MTokenNameEnum);

describe('Token contracts', () => {
  mProducts.forEach((product) => {
    describe(`${product}`, () => {
      mTokenContractsSuits(product);
    });
  });
  describe('mTokenPermissioned (mTokenPermissionedTest)', () => {
    describe('transfer()', () => {
      it('should fail: transfer when sender is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
        await accessControl.revokeRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );

        await expect(
          mTokenPermissioned.connect(from).transfer(to.address, 1),
        ).revertedWithCustomError(
          mTokenPermissioned,
          acErrors.WMAC_HASNT_ROLE().customErrorName,
        );
      });

      it('should fail: transfer when recipient is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);

        await expect(
          mTokenPermissioned.connect(from).transfer(to.address, 1),
        ).revertedWithCustomError(
          mTokenPermissioned,
          acErrors.WMAC_HASNT_ROLE().customErrorName,
        );
      });

      it('should fail: transfer when from is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
        await blackList(
          {
            blacklistable: mTokenPermissioned,
            accessControl,
            owner,
          },
          from,
        );

        await expect(
          mTokenPermissioned.connect(from).transfer(to.address, 1),
        ).revertedWithCustomError(
          mTokenPermissioned,
          acErrors.WMAC_HAS_ROLE().customErrorName,
        );
      });

      it('should fail: transfer when token is paused', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);

        await mTokenPermissioned.connect(owner).pause();

        await expect(
          mTokenPermissioned.connect(from).transfer(to.address, 1),
        ).revertedWith('ERC20Pausable: token transfer while paused');
      });

      it('should fail: mint when receiver is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenPermissioned } =
          await loadFixture(mTokenPermissionedFixture.bind(this, baseFixture));

        await mint(
          { tokenContract: mTokenPermissioned, owner },
          regularAccounts[0],
          1,
          { revertCustomError: acErrors.WMAC_HASNT_ROLE() },
        );
      });

      it('transfer when both parties are greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);

        await expect(mTokenPermissioned.connect(from).transfer(to.address, 1))
          .not.reverted;
        expect(await mTokenPermissioned.balanceOf(to.address)).eq(1);
      });

      it('mint when receiver is greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const to = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );

        await mint(
          { tokenContract: mTokenPermissioned, owner },
          to,
          parseUnits('1'),
        );
      });

      it('burn without greenlist on holder', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          holder.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, holder, 1);
        await accessControl.revokeRole(
          mTokenPermissionedRoles.greenlisted,
          holder.address,
        );

        await burn({ tokenContract: mTokenPermissioned, owner }, holder, 1);
      });
    });

    describe('transferFrom()', () => {
      const greenlistComboCases: {
        fromGreenlisted: boolean;
        toGreenlisted: boolean;
        callerGreenlisted: boolean;
        expectSuccess: boolean;
      }[] = [
        {
          fromGreenlisted: true,
          toGreenlisted: true,
          callerGreenlisted: true,
          expectSuccess: true,
        },
        {
          fromGreenlisted: true,
          toGreenlisted: true,
          callerGreenlisted: false,
          expectSuccess: true,
        },
        {
          fromGreenlisted: false,
          toGreenlisted: true,
          callerGreenlisted: true,
          expectSuccess: false,
        },
        {
          fromGreenlisted: false,
          toGreenlisted: true,
          callerGreenlisted: false,
          expectSuccess: false,
        },
        {
          fromGreenlisted: false,
          toGreenlisted: false,
          callerGreenlisted: true,
          expectSuccess: false,
        },
        {
          fromGreenlisted: false,
          toGreenlisted: false,
          callerGreenlisted: false,
          expectSuccess: false,
        },
        {
          fromGreenlisted: true,
          toGreenlisted: false,
          callerGreenlisted: true,
          expectSuccess: false,
        },
        {
          fromGreenlisted: true,
          toGreenlisted: false,
          callerGreenlisted: false,
          expectSuccess: false,
        },
      ];

      greenlistComboCases.forEach(
        ({
          fromGreenlisted,
          toGreenlisted,
          callerGreenlisted,
          expectSuccess,
        }) => {
          const fromL = fromGreenlisted ? 'greenlisted' : 'not greenlisted';
          const toL = toGreenlisted ? 'greenlisted' : 'not greenlisted';
          const callerL = callerGreenlisted ? 'greenlisted' : 'not greenlisted';

          it(
            expectSuccess
              ? `succeeds: from ${fromL}, to ${toL}, caller ${callerL}`
              : `should fail: from ${fromL}, to ${toL}, caller ${callerL}`,
            async () => {
              const baseFixture = await defaultDeploy();
              const {
                owner,
                accessControl,
                regularAccounts,
                mTokenPermissioned,
                mTokenPermissionedRoles,
              } = await loadFixture(
                mTokenPermissionedFixture.bind(this, baseFixture),
              );

              const from = regularAccounts[0];
              const caller = regularAccounts[1];
              const to = regularAccounts[2];
              const { greenlisted } = mTokenPermissionedRoles;

              await accessControl.grantRole(greenlisted, from.address);
              await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
              await mTokenPermissioned.connect(from).approve(caller.address, 1);

              if (!fromGreenlisted) {
                await accessControl.revokeRole(greenlisted, from.address);
              }
              if (toGreenlisted) {
                await accessControl.grantRole(greenlisted, to.address);
              }
              if (callerGreenlisted) {
                await accessControl.grantRole(greenlisted, caller.address);
              }

              const tx = mTokenPermissioned
                .connect(caller)
                .transferFrom(from.address, to.address, 1);

              if (expectSuccess) {
                await expect(tx).not.reverted;
                expect(await mTokenPermissioned.balanceOf(to.address)).eq(1);
              } else {
                await expect(tx).revertedWithCustomError(
                  mTokenPermissioned,
                  acErrors.WMAC_HASNT_ROLE().customErrorName,
                );
              }
            },
          );
        },
      );

      it('should fail: transferFrom when from is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
        await blackList(
          {
            blacklistable: mTokenPermissioned,
            accessControl,
            owner,
          },
          from,
        );
        await mTokenPermissioned.connect(from).approve(spender.address, 1);

        await expect(
          mTokenPermissioned
            .connect(spender)
            .transferFrom(from.address, to.address, 1),
        ).revertedWithCustomError(
          mTokenPermissioned,
          acErrors.WMAC_HAS_ROLE().customErrorName,
        );
      });

      it('should fail: transferFrom when to is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissioned,
          mTokenPermissionedRoles,
        } = await loadFixture(
          mTokenPermissionedFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];

        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          from.address,
        );
        await accessControl.grantRole(
          mTokenPermissionedRoles.greenlisted,
          to.address,
        );
        await mint({ tokenContract: mTokenPermissioned, owner }, from, 1);
        await blackList(
          {
            blacklistable: mTokenPermissioned,
            accessControl,
            owner,
          },
          to,
        );
        await mTokenPermissioned.connect(from).approve(spender.address, 1);

        await expect(
          mTokenPermissioned
            .connect(spender)
            .transferFrom(from.address, to.address, 1),
        ).revertedWithCustomError(
          mTokenPermissioned,
          acErrors.WMAC_HAS_ROLE().customErrorName,
        );
      });
    });
  });
});
