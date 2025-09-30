// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title DnTestMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for dnTEST contracts
 * @author RedDuck Software
 */
abstract contract DnTestMidasAccessControlRoles {
    /**
     * @notice actor that can manage DnTestDepositVault
     */
    bytes32 public constant DN_TEST_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("DN_TEST_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnTestRedemptionVault
     */
    bytes32 public constant DN_TEST_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("DN_TEST_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnTestCustomAggregatorFeed and DnTestDataFeed
     */
    bytes32 public constant DN_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("DN_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
