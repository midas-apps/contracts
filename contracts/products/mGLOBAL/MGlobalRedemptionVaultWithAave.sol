// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../RedemptionVaultWithAave.sol";
import "./MGlobalMidasAccessControlRoles.sol";

/**
 * @title MGlobalRedemptionVaultWithAave
 * @notice Smart contract that handles mGLOBAL redemptions via Aave V3
 * @author RedDuck Software
 */
contract MGlobalRedemptionVaultWithAave is
    RedemptionVaultWithAave,
    MGlobalMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_GLOBAL_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
