// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title Re7ETHMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for Re7ETH contracts
 * @author RedDuck Software
 */
abstract contract Re7ETHMidasAccessControlRoles {
    /**
     * @notice actor that can manage Re7ETHDepositVault
     */
    bytes32 public constant RE7_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("RE7_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage Re7ETHRedemptionVault
     */
    bytes32 public constant RE7_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("RE7_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage Re7ETHCustomAggregatorFeed and Re7ETHDataFeed
     */
    bytes32 public constant RE7_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("RE7_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
