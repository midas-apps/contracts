import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

import { Account, OptionalCommonParams, getAccount } from './common.helpers';

import {
  Blacklistable,
  Greenlistable,
  MidasAccessControl,
} from '../../typechain-types';

type CommonParamsBlackList = {
  blacklistable: Blacklistable;
  accessControl: MidasAccessControl;
  owner: SignerWithAddress;
};

type CommonParamsGreenList = {
  greenlistable: Greenlistable;
  accessControl: MidasAccessControl;
  role?: string;
  owner: SignerWithAddress;
};

export const acErrors = {
  WMAC_HASNT_ROLE: 'WMAC: hasnt role',
  WMAC_HAS_ROLE: 'WMAC: has role',
};

export const blackList = async (
  { blacklistable, accessControl, owner }: CommonParamsBlackList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      accessControl
        .connect(opt?.from ?? owner)
        .grantRole(await blacklistable.BLACKLISTED_ROLE(), account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .grantRole(await blacklistable.BLACKLISTED_ROLE(), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.BLACKLISTED_ROLE(),
      account,
    ),
  ).eq(true);
};

export const unBlackList = async (
  { blacklistable, accessControl, owner }: CommonParamsBlackList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      accessControl
        .connect(opt?.from ?? owner)
        .revokeRole(await blacklistable.BLACKLISTED_ROLE(), account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .revokeRole(await blacklistable.BLACKLISTED_ROLE(), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleRevoked(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      await accessControl.BLACKLISTED_ROLE(),
      account,
    ),
  ).eq(false);
};

export const greenListToggler = async (
  { greenlistable, accessControl, owner, role }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      accessControl
        .connect(opt?.from ?? owner)
        .grantRole(
          role ?? (await greenlistable.greenlistTogglerRole()),
          account,
        ),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .grantRole(role ?? (await greenlistable.greenlistTogglerRole()), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      role ?? (await greenlistable.greenlistTogglerRole()),
      account,
    ),
  ).eq(true);
};

export const greenList = async (
  { greenlistable, accessControl, owner, role }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      accessControl
        .connect(opt?.from ?? owner)
        .grantRole(role ?? (await greenlistable.GREENLISTED_ROLE()), account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .grantRole(role ?? (await greenlistable.GREENLISTED_ROLE()), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleGranted(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      role ?? (await accessControl.GREENLISTED_ROLE()),
      account,
    ),
  ).eq(true);
};

export const unGreenList = async (
  { greenlistable, accessControl, owner, role }: CommonParamsGreenList,
  account: Account,
  opt?: OptionalCommonParams,
) => {
  account = getAccount(account);

  if (opt?.revertMessage) {
    await expect(
      accessControl
        .connect(opt?.from ?? owner)
        .revokeRole(role ?? (await greenlistable.GREENLISTED_ROLE()), account),
    ).revertedWith(opt?.revertMessage);
    return;
  }

  await expect(
    accessControl
      .connect(opt?.from ?? owner)
      .revokeRole(role ?? (await greenlistable.GREENLISTED_ROLE()), account),
  ).to.emit(
    accessControl,
    accessControl.interface.events['RoleRevoked(bytes32,address,address)'].name,
  ).to.not.reverted;

  expect(
    await accessControl.hasRole(
      role ?? (await accessControl.GREENLISTED_ROLE()),
      account,
    ),
  ).eq(false);
};
