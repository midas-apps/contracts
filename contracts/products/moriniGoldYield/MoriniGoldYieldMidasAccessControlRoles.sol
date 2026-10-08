// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MoriniGoldYieldMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for moriniGoldYield contracts
 * @author RedDuck Software
 */
abstract contract MoriniGoldYieldMidasAccessControlRoles {
    /**
     * @notice actor that can manage MoriniGoldYieldDepositVault
     */
    bytes32 public constant MORINI_GOLD_YIELD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("MORINI_GOLD_YIELD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MoriniGoldYieldRedemptionVault
     */
    bytes32 public constant MORINI_GOLD_YIELD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("MORINI_GOLD_YIELD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MoriniGoldYieldCustomAggregatorFeed and MoriniGoldYieldDataFeed
     */
    bytes32
        public constant MORINI_GOLD_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("MORINI_GOLD_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
