// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MKRalphaMidasAccessControlRoles.sol";

/**
 * @title MKRalphaDepositVault
 * @notice Smart contract that handles mKRalpha minting
 * @author RedDuck Software
 */
contract MKRalphaDepositVault is DepositVault, MKRalphaMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_KRALPHA_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
