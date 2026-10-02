// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./Re7YIELDMidasAccessControlRoles.sol";

/**
 * @title Re7YIELDDepositVault
 * @notice Smart contract that handles Re7YIELD minting
 * @author RedDuck Software
 */
contract Re7YIELDDepositVault is DepositVault, Re7YIELDMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RE7_YIELD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
