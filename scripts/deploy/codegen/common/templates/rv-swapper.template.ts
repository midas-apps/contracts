import { MTokenName } from '../../../../../config';
import { getTokenContractNames } from '../../../../../helpers/contracts';
import { getRolesNamesForToken } from '../../../../../helpers/roles';

export const getRvSwapperContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rvSwapper,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../RedemptionVaultWithSwapper.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.rvSwapper}
   * @notice Smart contract that handles ${contractNames.token} redemptions
   * @author RedDuck Software
   */
  contract ${contractNames.rvSwapper} is
      RedemptionVaultWithSwapper,
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
  }`,
  };
};
