// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title LiquidDefiMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for liquidDeFi contracts
 * @author RedDuck Software
 */
abstract contract LiquidDefiMidasAccessControlRoles {
    /**
     * @notice actor that can manage LiquidDefiDepositVault
     */
    bytes32 public constant LIQUID_DEFI_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_DEFI_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidDefiRedemptionVault
     */
    bytes32 public constant LIQUID_DEFI_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_DEFI_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidDefiCustomAggregatorFeed and LiquidDefiDataFeed
     */
    bytes32 public constant LIQUID_DEFI_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("LIQUID_DEFI_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
