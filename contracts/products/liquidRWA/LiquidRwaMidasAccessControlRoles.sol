// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title LiquidRwaMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for liquidRWA contracts
 * @author RedDuck Software
 */
abstract contract LiquidRwaMidasAccessControlRoles {
    /**
     * @notice actor that can manage LiquidRwaDepositVault
     */
    bytes32 public constant LIQUID_RWA_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_RWA_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidRwaRedemptionVault
     */
    bytes32 public constant LIQUID_RWA_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_RWA_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidRwaCustomAggregatorFeed and LiquidRwaDataFeed
     */
    bytes32 public constant LIQUID_RWA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("LIQUID_RWA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
