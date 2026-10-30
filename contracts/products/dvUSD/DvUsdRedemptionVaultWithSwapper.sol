// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./DvUsdMidasAccessControlRoles.sol";

/**
 * @title DvUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles dvUSD redemptions
 * @author RedDuck Software
 */
contract DvUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    DvUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DV_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return DRIVVY_GREENLISTED_ROLE;
    }
}
