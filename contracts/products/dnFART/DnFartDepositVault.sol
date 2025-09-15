// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./DnFartMidasAccessControlRoles.sol";

/**
 * @title DnFartDepositVault
 * @notice Smart contract that handles dnFART minting
 * @author RedDuck Software
 */
contract DnFartDepositVault is DepositVault, DnFartMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_FART_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
