import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { MTokenNameEnum } from '../../config';
import { getRolesForToken, getRolesNamesForToken } from '../../helpers/roles';
import { acErrors, blackList } from '../common/ac.helpers';
import {
  defaultDeploy,
  mTokenMinBalanceFixture,
  mTokenPermissionedFixture,
  mTokenPermissionedMinBalanceFixture,
} from '../common/fixtures';
import { burn, mint } from '../common/mTBILL.helpers';
import { tokenContractsTests } from '../common/token.tests';

const mProducts = Object.values(MTokenNameEnum);

describe('Token contracts', () => {
  mProducts.forEach((product) => {
    describe(`${product}`, () => {
      tokenContractsTests(product);
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
        ).revertedWith(acErrors.WMAC_HASNT_ROLE);
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
        ).revertedWith(acErrors.WMAC_HASNT_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
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
          { revertMessage: acErrors.WMAC_HASNT_ROLE },
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
                await expect(tx).revertedWith(acErrors.WMAC_HASNT_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
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
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });
    });
  });

  describe('mTokenMinBalance (mTokenMinBalanceTest)', () => {
    describe('setIsFreeFromMinBalance()', () => {
      it('should fail: call from address without DEFAULT_ADMIN_ROLE', async () => {
        const baseFixture = await defaultDeploy();
        const { regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        await expect(
          mTokenMinBalance
            .connect(regularAccounts[0])
            .setIsFreeFromMinBalance(regularAccounts[1].address, true),
        ).revertedWith(acErrors.WMAC_HASNT_ROLE);
      });

      it('set isFreeFromMinBalance to true', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const user = regularAccounts[0];
        await expect(
          mTokenMinBalance
            .connect(owner)
            .setIsFreeFromMinBalance(user.address, true),
        )
          .to.emit(mTokenMinBalance, 'SetIsFreeFromMinBalance')
          .withArgs(user.address, true);

        expect(await mTokenMinBalance.isFreeFromMinBalance(user.address)).eq(
          true,
        );
      });

      it('set isFreeFromMinBalance to false', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const user = regularAccounts[0];
        await mTokenMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(user.address, true);

        await expect(
          mTokenMinBalance
            .connect(owner)
            .setIsFreeFromMinBalance(user.address, false),
        )
          .to.emit(mTokenMinBalance, 'SetIsFreeFromMinBalance')
          .withArgs(user.address, false);

        expect(await mTokenMinBalance.isFreeFromMinBalance(user.address)).eq(
          false,
        );
      });

      it('no-op when value is unchanged', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const user = regularAccounts[0];
        await expect(
          mTokenMinBalance
            .connect(owner)
            .setIsFreeFromMinBalance(user.address, false),
        ).to.not.emit(mTokenMinBalance, 'SetIsFreeFromMinBalance');
      });
    });

    describe('transfer()', () => {
      it('transfer when both parties hold above min balance after transfer', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const amount = parseUnits('0.1');

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );

        await expect(
          mTokenMinBalance.connect(from).transfer(to.address, amount),
        ).not.reverted;
        expect(await mTokenMinBalance.balanceOf(from.address)).eq(
          parseUnits('2.9'),
        );
        expect(await mTokenMinBalance.balanceOf(to.address)).eq(
          parseUnits('3.1'),
        );
      });

      it('should fail: transfer dust to empty recipient', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith('MTMB: min balance not met');
      });

      it('transfer dust to empty recipient when recipient is free from min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const amount = parseUnits('0.1');

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mTokenMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(to.address, true);

        await expect(
          mTokenMinBalance.connect(from).transfer(to.address, amount),
        ).not.reverted;
        expect(await mTokenMinBalance.balanceOf(to.address)).eq(amount);
      });

      it('should fail: transfer dust from waived sender to empty non-waived recipient', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mTokenMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(from.address, true);
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('0.3'),
        );

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith('MTMB: min balance not met');
      });

      it('transfer entire balance leaving sender at zero', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const amount = parseUnits('3');

        await mint({ tokenContract: mTokenMinBalance, owner }, from, amount);

        await expect(
          mTokenMinBalance.connect(from).transfer(to.address, amount),
        ).not.reverted;
        expect(await mTokenMinBalance.balanceOf(from.address)).eq(0);
        expect(await mTokenMinBalance.balanceOf(to.address)).eq(amount);
      });

      it('should fail: transfer leaving sender below min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('1'),
        );

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('2.5')),
        ).revertedWith('MTMB: min balance not met');
      });

      it('transfer leaving sender below min balance when sender is free from min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('1'),
        );
        await mTokenMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(from.address, true);

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('2.5')),
        ).not.reverted;
        expect(await mTokenMinBalance.balanceOf(from.address)).eq(
          parseUnits('0.5'),
        );
      });

      it('transfer leaving both parties at exactly min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('2'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('1'),
        );

        await expect(
          mTokenMinBalance.connect(from).transfer(to.address, parseUnits('1')),
        ).not.reverted;
        expect(await mTokenMinBalance.balanceOf(from.address)).eq(
          parseUnits('1'),
        );
        expect(await mTokenMinBalance.balanceOf(to.address)).eq(
          parseUnits('2'),
        );
      });

      it('should fail: transfer when from is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          from,
        );

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });

      it('should fail: transfer when to is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          to,
        );

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });

      it('should fail: transfer when token is paused', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenMinBalance.connect(owner).pause();

        await expect(
          mTokenMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith('ERC20Pausable: token transfer while paused');
      });
    });

    describe('transferFrom()', () => {
      it('transferFrom when both parties hold above min balance after transfer', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const amount = parseUnits('0.1');

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenMinBalance.connect(from).approve(spender.address, amount);

        await expect(
          mTokenMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).not.reverted;
      });

      it('should fail: transferFrom dust to empty recipient', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const amount = parseUnits('0.1');

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mTokenMinBalance.connect(from).approve(spender.address, amount);

        await expect(
          mTokenMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).revertedWith('MTMB: min balance not met');
      });

      it('should fail: transferFrom when from is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const amount = parseUnits('0.1');

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenMinBalance.connect(from).approve(spender.address, amount);
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          from,
        );

        await expect(
          mTokenMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });

      it('should fail: transferFrom when to is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const amount = parseUnits('0.1');

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenMinBalance.connect(from).approve(spender.address, amount);
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          to,
        );

        await expect(
          mTokenMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });
    });

    describe('mint()', () => {
      it('mint at least 1 token to empty recipient', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          regularAccounts[0],
          parseUnits('1'),
        );
      });

      it('should fail: mint less than 1 token to empty recipient', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          regularAccounts[0],
          parseUnits('0.5'),
          { revertMessage: 'MTMB: min balance not met' },
        );
      });

      it('mint less than 1 token to empty recipient when free from min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const to = regularAccounts[0];
        await mTokenMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(to.address, true);

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('0.5'),
        );
      });

      it('mint dust to recipient that already holds min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const to = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('1'),
        );
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('0.1'),
        );
      });

      it('should fail: mint when recipient is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const to = regularAccounts[0];
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          to,
        );

        await mint(
          { tokenContract: mTokenMinBalance, owner },
          to,
          parseUnits('1'),
          { revertMessage: acErrors.WMAC_HAS_ROLE },
        );
      });
    });

    describe('burn()', () => {
      it('burn leaving holder at zero', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('1'),
        );
        await burn(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('1'),
        );
      });

      it('burn leaving holder at or above min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('3'),
        );
        await burn(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('1'),
        );
        expect(await mTokenMinBalance.balanceOf(holder.address)).eq(
          parseUnits('2'),
        );
      });

      it('should fail: burn leaving holder below min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('3'),
        );

        await burn(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('2.5'),
          { revertMessage: 'MTMB: min balance not met' },
        );
      });

      it('burn leaving holder below min balance when free from min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('3'),
        );
        await mTokenMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(holder.address, true);

        await burn(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('2.5'),
        );
        expect(await mTokenMinBalance.balanceOf(holder.address)).eq(
          parseUnits('0.5'),
        );
      });

      it('should fail: burn when holder is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const holder = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('1'),
        );
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          holder,
        );

        await burn(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('1'),
          { revertMessage: acErrors.WMAC_HAS_ROLE },
        );
      });

      it('burnGoverned when holder is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, accessControl, regularAccounts, mTokenMinBalance } =
          await loadFixture(mTokenMinBalanceFixture.bind(this, baseFixture));

        const holder = regularAccounts[0];
        const amount = parseUnits('1');
        await mint({ tokenContract: mTokenMinBalance, owner }, holder, amount);
        await blackList(
          { blacklistable: mTokenMinBalance, accessControl, owner },
          holder,
        );

        await expect(
          mTokenMinBalance.connect(owner).burnGoverned(holder.address, amount),
        ).not.reverted;
        expect(await mTokenMinBalance.balanceOf(holder.address)).eq(0);
      });

      it('should fail: burnGoverned leaving holder below min balance', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenMinBalance } = await loadFixture(
          mTokenMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await mint(
          { tokenContract: mTokenMinBalance, owner },
          holder,
          parseUnits('3'),
        );

        await expect(
          mTokenMinBalance
            .connect(owner)
            .burnGoverned(holder.address, parseUnits('2.5')),
        ).revertedWith('MTMB: min balance not met');
      });
    });
  });

  describe('mTokenPermissionedMinBalance (mTokenPermissionedMinBalanceTest)', () => {
    describe('transfer()', () => {
      it('should fail: transfer when sender is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await accessControl.revokeRole(greenlisted, from.address);

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith(acErrors.WMAC_HASNT_ROLE);
      });

      it('should fail: transfer when recipient is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;

        await accessControl.grantRole(greenlisted, from.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith(acErrors.WMAC_HASNT_ROLE);
      });

      it('should fail: transfer dust to empty recipient when both greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith('MTMB: min balance not met');
      });

      it('transfer dust to empty recipient when recipient is free from min balance', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;
        const amount = parseUnits('0.1');

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mTokenPermissionedMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(to.address, true);

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, amount),
        ).not.reverted;
        expect(await mTokenPermissionedMinBalance.balanceOf(to.address)).eq(
          amount,
        );
      });

      it('should fail: transfer dust from waived sender to empty non-waived recipient', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mTokenPermissionedMinBalance
          .connect(owner)
          .setIsFreeFromMinBalance(from.address, true);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('0.3'),
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith('MTMB: min balance not met');
      });

      it('transfer when both greenlisted and above min balance', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;
        const amount = parseUnits('0.1');

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, amount),
        ).not.reverted;
      });

      it('should fail: transfer when from is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await blackList(
          {
            blacklistable: mTokenPermissionedMinBalance,
            accessControl,
            owner,
          },
          from,
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });

      it('should fail: transfer when to is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const to = regularAccounts[1];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await blackList(
          {
            blacklistable: mTokenPermissionedMinBalance,
            accessControl,
            owner,
          },
          to,
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(from)
            .transfer(to.address, parseUnits('0.1')),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });
    });

    describe('mint()', () => {
      it('should fail: mint when receiver is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const { owner, regularAccounts, mTokenPermissionedMinBalance } =
          await loadFixture(
            mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
          );

        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          regularAccounts[0],
          parseUnits('1'),
          { revertMessage: acErrors.WMAC_HASNT_ROLE },
        );
      });

      it('should fail: mint less than 1 token to empty greenlisted recipient', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const to = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          to.address,
        );

        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('0.5'),
          { revertMessage: 'MTMB: min balance not met' },
        );
      });

      it('mint when receiver is greenlisted and amount meets min balance', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const to = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          to.address,
        );

        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('1'),
        );
      });

      it('should fail: mint when recipient is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const to = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          to.address,
        );
        await blackList(
          {
            blacklistable: mTokenPermissionedMinBalance,
            accessControl,
            owner,
          },
          to,
        );

        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('1'),
          { revertMessage: acErrors.WMAC_HAS_ROLE },
        );
      });
    });

    describe('burn()', () => {
      it('burn without greenlist on holder', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          holder.address,
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          parseUnits('1'),
        );
        await accessControl.revokeRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          holder.address,
        );

        await burn(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          parseUnits('1'),
        );
      });

      it('should fail: burn leaving holder below min balance', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          holder.address,
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          parseUnits('3'),
        );

        await burn(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          parseUnits('2.5'),
          { revertMessage: 'MTMB: min balance not met' },
        );
      });

      it('should fail: burn when holder is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          holder.address,
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          parseUnits('1'),
        );
        await blackList(
          {
            blacklistable: mTokenPermissionedMinBalance,
            accessControl,
            owner,
          },
          holder,
        );

        await burn(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          parseUnits('1'),
          { revertMessage: acErrors.WMAC_HAS_ROLE },
        );
      });

      it('burnGoverned when holder is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const holder = regularAccounts[0];
        const amount = parseUnits('1');
        await accessControl.grantRole(
          mTokenPermissionedMinBalanceRoles.greenlisted,
          holder.address,
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          holder,
          amount,
        );
        await blackList(
          {
            blacklistable: mTokenPermissionedMinBalance,
            accessControl,
            owner,
          },
          holder,
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(owner)
            .burnGoverned(holder.address, amount),
        ).not.reverted;
        expect(await mTokenPermissionedMinBalance.balanceOf(holder.address)).eq(
          0,
        );
      });
    });

    describe('transferFrom()', () => {
      it('should fail: transferFrom when from is not greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;
        const amount = parseUnits('0.1');

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenPermissionedMinBalance
          .connect(from)
          .approve(spender.address, amount);
        await accessControl.revokeRole(greenlisted, from.address);

        await expect(
          mTokenPermissionedMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).revertedWith(acErrors.WMAC_HASNT_ROLE);
      });

      it('should fail: transferFrom dust to empty recipient when both greenlisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;
        const amount = parseUnits('0.1');

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mTokenPermissionedMinBalance
          .connect(from)
          .approve(spender.address, amount);

        await expect(
          mTokenPermissionedMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).revertedWith('MTMB: min balance not met');
      });

      it('transferFrom when both greenlisted and above min balance', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;
        const amount = parseUnits('0.1');

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenPermissionedMinBalance
          .connect(from)
          .approve(spender.address, amount);

        await expect(
          mTokenPermissionedMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).not.reverted;
      });

      it('should fail: transferFrom when from is blacklisted', async () => {
        const baseFixture = await defaultDeploy();
        const {
          owner,
          accessControl,
          regularAccounts,
          mTokenPermissionedMinBalance,
          mTokenPermissionedMinBalanceRoles,
        } = await loadFixture(
          mTokenPermissionedMinBalanceFixture.bind(this, baseFixture),
        );

        const from = regularAccounts[0];
        const spender = regularAccounts[1];
        const to = regularAccounts[2];
        const { greenlisted } = mTokenPermissionedMinBalanceRoles;
        const amount = parseUnits('0.1');

        await accessControl.grantRole(greenlisted, from.address);
        await accessControl.grantRole(greenlisted, to.address);
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          from,
          parseUnits('3'),
        );
        await mint(
          { tokenContract: mTokenPermissionedMinBalance, owner },
          to,
          parseUnits('3'),
        );
        await mTokenPermissionedMinBalance
          .connect(from)
          .approve(spender.address, amount);
        await blackList(
          {
            blacklistable: mTokenPermissionedMinBalance,
            accessControl,
            owner,
          },
          from,
        );

        await expect(
          mTokenPermissionedMinBalance
            .connect(spender)
            .transferFrom(from.address, to.address, amount),
        ).revertedWith(acErrors.WMAC_HAS_ROLE);
      });
    });
  });
});

describe('Shared greenlist role (mGLO -> mGLOBAL)', () => {
  it('mGLO greenlist role name is M_GLOBAL_GREENLISTED_ROLE', () => {
    expect(getRolesNamesForToken('mGLO').greenlisted).eq(
      'M_GLOBAL_GREENLISTED_ROLE',
    );
  });

  it('mGLO greenlist role hash equals mGLOBAL greenlist role hash', () => {
    expect(getRolesForToken('mGLO').greenlisted).eq(
      getRolesForToken('mGLOBAL').greenlisted,
    );
  });

  it('mGLO keeps its own (separated) operational roles', () => {
    const mGloRoles = getRolesNamesForToken('mGLO');
    expect(mGloRoles.minter).eq('M_GLO_MINT_OPERATOR_ROLE');
    expect(mGloRoles.burner).eq('M_GLO_BURN_OPERATOR_ROLE');
    expect(mGloRoles.depositVaultAdmin).eq('M_GLO_DEPOSIT_VAULT_ADMIN_ROLE');
    expect(mGloRoles.redemptionVaultAdmin).eq(
      'M_GLO_REDEMPTION_VAULT_ADMIN_ROLE',
    );
    expect(mGloRoles.customFeedAdmin).eq(
      'M_GLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE',
    );
  });
});
