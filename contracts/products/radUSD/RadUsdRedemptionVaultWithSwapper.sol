// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./RadUsdMidasAccessControlRoles.sol";

/**
 * @title RadUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles radUSD redemptions
 * @author RedDuck Software
 */
contract RadUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    RadUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RAD_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return RADIAL_GREENLISTED_ROLE;
    }
}
