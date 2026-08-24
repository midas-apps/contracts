// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MArbETHMidasAccessControlRoles.sol";

/**
 * @title MArbETHRedemptionVaultWithSwapper
 * @notice Smart contract that handles mArbETH redemptions
 * @author RedDuck Software
 */
contract MArbETHRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MArbETHMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ARB_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_ARB_GREENLISTED_ROLE;
    }
}
