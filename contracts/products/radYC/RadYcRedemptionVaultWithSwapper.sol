// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./RadYcMidasAccessControlRoles.sol";

/**
 * @title RadYcRedemptionVaultWithSwapper
 * @notice Smart contract that handles radYC redemptions
 * @author RedDuck Software
 */
contract RadYcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    RadYcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RAD_YC_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return RADIAL_GREENLISTED_ROLE;
    }
}
