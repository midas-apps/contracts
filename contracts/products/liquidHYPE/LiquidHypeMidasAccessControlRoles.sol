// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title LiquidHypeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for liquidHYPE contracts
 * @author RedDuck Software
 */
abstract contract LiquidHypeMidasAccessControlRoles {
    /**
     * @notice actor that can manage LiquidHypeDepositVault
     */
    bytes32 public constant LIQUID_HYPE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_HYPE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidHypeRedemptionVault
     */
    bytes32 public constant LIQUID_HYPE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("LIQUID_HYPE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LiquidHypeCustomAggregatorFeed and LiquidHypeDataFeed
     */
    bytes32 public constant LIQUID_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("LIQUID_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
