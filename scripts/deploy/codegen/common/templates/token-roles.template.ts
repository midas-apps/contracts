import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getTokenRolesContractFromTemplate = async (mToken: MTokenName) => {
  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );

  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.roles,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  /**
   * @title ${contractNames.roles}
   * @notice Base contract that stores all roles descriptors for ${contractNames.token} contracts
   * @author RedDuck Software
   */
  abstract contract ${contractNames.roles} {
      /**
       * @notice actor that can manage ${contractNames.dv}
       */
      bytes32 public constant ${roles.depositVaultAdmin} =
          keccak256("${roles.depositVaultAdmin}");

      /**
       * @notice actor that can manage ${contractNames.rv}
       */
      bytes32 public constant ${roles.redemptionVaultAdmin} =
          keccak256("${roles.redemptionVaultAdmin}");

      /**
       * @notice actor that can manage ${contractNames.customAggregator} and ${contractNames.dataFeed}
       */
      bytes32 public constant ${roles.customFeedAdmin} =
          keccak256("${roles.customFeedAdmin}");
  }`,
  };
};
