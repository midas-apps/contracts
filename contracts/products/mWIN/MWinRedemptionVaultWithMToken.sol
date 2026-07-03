// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithMToken.sol";
import "./MWinMidasAccessControlRoles.sol";

/**
 * @title MWinRedemptionVaultWithMToken
 * @notice Smart contract that handles mWIN redemptions using mToken
 * liquid strategy. Upgrade-compatible replacement for
 * MWinRedemptionVaultWithSwapper.
 * @author RedDuck Software
 */
contract MWinRedemptionVaultWithMToken is
    RedemptionVaultWithMToken,
    MWinMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_WIN_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_WIN_GREENLISTED_ROLE;
    }
}
