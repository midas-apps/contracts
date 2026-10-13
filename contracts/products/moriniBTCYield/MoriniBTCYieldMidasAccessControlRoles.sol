// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MoriniBTCYieldMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for moriniBTCYield contracts
 * @author RedDuck Software
 */
abstract contract MoriniBTCYieldMidasAccessControlRoles {
    /**
     * @notice actor that can manage MoriniBTCYieldDepositVault
     */
    bytes32 public constant MORINI_BTC_YIELD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("MORINI_BTC_YIELD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MoriniBTCYieldRedemptionVault
     */
    bytes32 public constant MORINI_BTC_YIELD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("MORINI_BTC_YIELD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MoriniBTCYieldCustomAggregatorFeed and MoriniBTCYieldDataFeed
     */
    bytes32 public constant MORINI_BTC_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("MORINI_BTC_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
