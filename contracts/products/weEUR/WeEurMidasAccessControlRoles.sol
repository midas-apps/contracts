// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title WeEurMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for weEUR contracts
 * @author RedDuck Software
 */
abstract contract WeEurMidasAccessControlRoles {
    /**
     * @notice actor that can manage WeEurDepositVault
     */
    bytes32 public constant WE_EUR_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("WE_EUR_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage WeEurRedemptionVault
     */
    bytes32 public constant WE_EUR_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("WE_EUR_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage WeEurCustomAggregatorFeed and WeEurDataFeed
     */
    bytes32 public constant WE_EUR_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("WE_EUR_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
