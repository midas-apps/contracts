import { MTokenName } from '../../../../../config';
import { getTokenContractNames } from '../../../../../helpers/contracts';
import { getRolesNamesForToken } from '../../../../../helpers/roles';

export const getRvContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rv,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../RedemptionVault.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.rv}
   * @notice Smart contract that handles ${contractNames.token} minting
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
  }`,
  };
};
