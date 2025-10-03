// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title ObeatUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for obeatUSD contracts
 * @author RedDuck Software
 */
abstract contract ObeatUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage ObeatUsdDepositVault
     */
    bytes32 public constant OBEAT_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("OBEAT_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ObeatUsdRedemptionVault
     */
    bytes32 public constant OBEAT_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("OBEAT_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ObeatUsdCustomAggregatorFeed and ObeatUsdDataFeed
     */
    bytes32 public constant OBEAT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("OBEAT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
