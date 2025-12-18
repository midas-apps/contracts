// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title LiquidReserveMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for liquidRESERVE contracts
 * @author RedDuck Software
 */
abstract contract LiquidReserveMidasAccessControlRoles {
    /**
     * @notice actor that can manage LiquidReserveDepositVault
     */
    bytes32 public constant LIQUID_RESERVE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_RESERVE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidReserveRedemptionVault
     */
    bytes32 public constant LIQUID_RESERVE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_RESERVE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidReserveCustomAggregatorFeed and LiquidReserveDataFeed
     */
    bytes32 public constant LIQUID_RESERVE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("LIQUID_RESERVE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
