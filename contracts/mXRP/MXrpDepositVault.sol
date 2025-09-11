// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MXrpMidasAccessControlRoles.sol";

/**
 * @title MXrpDepositVault
 * @notice Smart contract that handles mXRP minting
 * @author RedDuck Software
 */
contract MXrpDepositVault is DepositVault, MXrpMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_XRP_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
