import { MTokenName } from '../../../../../config';
import { getTokenContractNames } from '../../../../../helpers/contracts';
import { getRolesNamesForToken } from '../../../../../helpers/roles';

export const getDvContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.dv,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../DepositVault.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.dv}
   * @notice Smart contract that handles ${contractNames.token} minting
   * @author RedDuck Software
   */
  contract ${contractNames.dv} is DepositVault, ${contractNames.roles} {
      /**
       * @dev leaving a storage gap for futures updates
       */
      uint256[50] private __gap;

      /**
       * @inheritdoc ManageableVault
       */
      function vaultRole() public pure override returns (bytes32) {
          return ${roles.depositVaultAdmin};
      }
  }`,
  };
};
