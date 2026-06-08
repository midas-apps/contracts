// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./QHVNMidasAccessControlRoles.sol";

/**
 * @title QHVNRedemptionVaultWithSwapper
 * @notice Smart contract that handles qHVN redemptions
 * @author RedDuck Software
 */
contract QHVNRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    QHVNMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return Q_HVN_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return Q_HVN_GREENLISTED_ROLE;
    }
}
