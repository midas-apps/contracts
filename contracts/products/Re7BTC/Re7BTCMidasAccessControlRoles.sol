// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title Re7BTCMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for Re7BTC contracts
 * @author RedDuck Software
 */
abstract contract Re7BTCMidasAccessControlRoles {
    /**
     * @notice actor that can manage Re7BTCDepositVault
     */
    bytes32 public constant RE7_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("RE7_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage Re7BTCRedemptionVault
     */
    bytes32 public constant RE7_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("RE7_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage Re7BTCCustomAggregatorFeed and Re7BTCDataFeed
     */
    bytes32 public constant RE7_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("RE7_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
