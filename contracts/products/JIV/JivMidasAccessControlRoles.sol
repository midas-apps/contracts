// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title JivMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for JIV contracts
 * @author RedDuck Software
 */
abstract contract JivMidasAccessControlRoles {
    /**
     * @notice actor that can manage JivDepositVault
     */
    bytes32 public constant JIV_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("JIV_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage JivRedemptionVault
     */
    bytes32 public constant JIV_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("JIV_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage JivCustomAggregatorFeed and JivDataFeed
     */
    bytes32 public constant JIV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("JIV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
