// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./DnPumpMidasAccessControlRoles.sol";

/**
 * @title DnPumpDepositVault
 * @notice Smart contract that handles dnPUMP minting
 * @author RedDuck Software
 */
contract DnPumpDepositVault is DepositVault, DnPumpMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_PUMP_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
