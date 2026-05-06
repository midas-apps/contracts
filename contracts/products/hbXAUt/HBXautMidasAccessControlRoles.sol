// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title HBXautMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for hbXAUt contracts
 * @author RedDuck Software
 */
abstract contract HBXautMidasAccessControlRoles {
    /**
     * @notice actor that can manage HBXautDepositVault
     */
    bytes32 public constant HB_XAUT_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("HB_XAUT_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HBXautRedemptionVault
     */
    bytes32 public constant HB_XAUT_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("HB_XAUT_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HBXautCustomAggregatorFeed and HBXautDataFeed
     */
    bytes32 public constant HB_XAUT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("HB_XAUT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
