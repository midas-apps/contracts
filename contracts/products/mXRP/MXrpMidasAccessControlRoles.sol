// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MXrpMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mXRP contracts
 * @author RedDuck Software
 */
abstract contract MXrpMidasAccessControlRoles {
    /**
     * @notice actor that can manage MXrpDepositVault
     */
    bytes32 public constant M_XRP_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_XRP_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MXrpRedemptionVault
     */
    bytes32 public constant M_XRP_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_XRP_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MXrpCustomAggregatorFeed and MXrpDataFeed
     */
    bytes32 public constant M_XRP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_XRP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
