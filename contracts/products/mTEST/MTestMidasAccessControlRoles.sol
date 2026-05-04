// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MTestMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mTEST contracts
 * @author RedDuck Software
 */
abstract contract MTestMidasAccessControlRoles {
    /**
     * @notice actor that can manage MTestDepositVault
     */
    bytes32 public constant M_TEST_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_TEST_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MTestRedemptionVault
     */
    bytes32 public constant M_TEST_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_TEST_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MTestCustomAggregatorFeed and MTestDataFeed
     */
    bytes32 public constant M_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mTEST
     */
    bytes32 public constant M_TEST_GREENLISTED_ROLE =
        keccak256("M_TEST_GREENLISTED_ROLE");
}
