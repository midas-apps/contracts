import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getRvContractFromTemplate = async (
  mToken: MTokenName,
  optionalParams?: Record<string, unknown>,
) => {
  const { vaultUseTokenLevelGreenList = false } = optionalParams || {};

  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );

  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rv,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.34;

  import "../../RedemptionVault.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.rv}
   * @notice Smart contract that handles ${contractNames.token} redemptions
   * @author RedDuck Software
   */
  contract ${contractNames.rv} is
      RedemptionVault,
      ${contractNames.roles}
  {
      /**
       * @dev leaving a storage gap for futures updates
       */
      uint256[50] private __gap;

      /**
       * @inheritdoc ManageableVault
       */
      function vaultRole() public pure override returns (bytes32) {
          return ${roles.redemptionVaultAdmin};
      }

      ${
        vaultUseTokenLevelGreenList
          ? `
        /**
         * @inheritdoc Greenlistable
         */
        function greenlistedRole() public pure override returns (bytes32) {
            return ${roles.greenlisted};
        }
        `
          : ''
      }
  }`,
  };
};
