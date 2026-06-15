import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

import {
  Account,
  OptionalCommonParams,
  getAccount,
  handleRevert,
} from './common.helpers';

import { SanctionsListMock, WithSanctionsList } from '../../typechain-types';

type CommonParamsSetSanctionsList = {
  owner: SignerWithAddress;
  withSanctionsList: WithSanctionsList;
};

type CommonParamsSanctionUser = {
  sanctionsList: SanctionsListMock;
};

export const sanctionUser = async (
  { sanctionsList }: CommonParamsSanctionUser,
  user: Account,
) => {
  user = getAccount(user);

  await expect(sanctionsList.setSanctioned(user, true)).to.not.reverted;
};

export const setSanctionsList = async (
  { withSanctionsList, owner }: CommonParamsSetSanctionsList,
  newSanctionsList: Account,
  opt?: OptionalCommonParams,
) => {
  const sender = opt?.from ?? owner;
  newSanctionsList = getAccount(newSanctionsList);

  if (
    await handleRevert(
      withSanctionsList
        .connect(sender)
        .setSanctionsList.bind(this, newSanctionsList),
      withSanctionsList,
      opt,
    )
  ) {
    return;
  }

  await expect(
    withSanctionsList.connect(sender).setSanctionsList(newSanctionsList),
  ).to.emit(
    withSanctionsList,
    withSanctionsList.interface.events['SetSanctionsList(address)'].name,
  ).to.not.reverted;

  expect(await withSanctionsList.sanctionsList()).eq(newSanctionsList);
};
