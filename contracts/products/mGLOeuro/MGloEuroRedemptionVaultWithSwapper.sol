// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MGloEuroMidasAccessControlRoles.sol";

/**
 * @title MGloEuroRedemptionVaultWithSwapper
 * @notice Smart contract that handles mGLOeuro redemptions
 * @author RedDuck Software
 */
contract MGloEuroRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MGloEuroMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_GLO_EURO_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
