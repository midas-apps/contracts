// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MArbMidasAccessControlRoles.sol";

/**
 * @title MArbRedemptionVaultWithSwapper
 * @notice Smart contract that handles mArb redemptions
 * @author RedDuck Software
 */
contract MArbRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MArbMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ARB_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_ARB_GREENLISTED_ROLE;
    }
}
