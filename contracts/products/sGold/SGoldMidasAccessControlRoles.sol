// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title SGoldMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for sGold contracts
 * @author RedDuck Software
 */
abstract contract SGoldMidasAccessControlRoles {
    /**
     * @notice actor that can manage SGoldDepositVault
     */
    bytes32 public constant S_GOLD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("S_GOLD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SGoldRedemptionVault
     */
    bytes32 public constant S_GOLD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("S_GOLD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SGoldCustomAggregatorFeed and SGoldDataFeed
     */
    bytes32 public constant S_GOLD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("S_GOLD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
