// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MArbMidasAccessControlRoles.sol";

/**
 * @title MArbDepositVault
 * @notice Smart contract that handles mArb minting
 * @author RedDuck Software
 */
contract MArbDepositVault is DepositVault, MArbMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ARB_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_ARB_GREENLISTED_ROLE;
    }
}
