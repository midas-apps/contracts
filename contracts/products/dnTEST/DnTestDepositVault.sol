// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./DnTestMidasAccessControlRoles.sol";

/**
 * @title DnTestDepositVault
 * @notice Smart contract that handles dnTEST minting
 * @author RedDuck Software
 */
contract DnTestDepositVault is DepositVault, DnTestMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_TEST_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
