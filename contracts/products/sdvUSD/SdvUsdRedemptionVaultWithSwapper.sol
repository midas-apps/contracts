// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./SdvUsdMidasAccessControlRoles.sol";

/**
 * @title SdvUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles sdvUSD redemptions
 * @author RedDuck Software
 */
contract SdvUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    SdvUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return SDV_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return DRIVVY_GREENLISTED_ROLE;
    }
}
