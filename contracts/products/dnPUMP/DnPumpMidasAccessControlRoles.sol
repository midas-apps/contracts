// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title DnPumpMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for dnPUMP contracts
 * @author RedDuck Software
 */
abstract contract DnPumpMidasAccessControlRoles {
    /**
     * @notice actor that can manage DnPumpDepositVault
     */
    bytes32 public constant DN_PUMP_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("DN_PUMP_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnPumpRedemptionVault
     */
    bytes32 public constant DN_PUMP_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("DN_PUMP_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnPumpCustomAggregatorFeed and DnPumpDataFeed
     */
    bytes32 public constant DN_PUMP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("DN_PUMP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
