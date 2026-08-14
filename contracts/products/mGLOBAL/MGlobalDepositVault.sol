// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MGlobalMidasAccessControlRoles.sol";

/**
 * @title MGlobalDepositVault
 * @notice Smart contract that handles mGLOBAL minting
 * @author RedDuck Software
 */
contract MGlobalDepositVault is DepositVault, MGlobalMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_GLOBAL_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
