// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title Re7YIELDMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for Re7YIELD contracts
 * @author RedDuck Software
 */
abstract contract Re7YIELDMidasAccessControlRoles {
    /**
     * @notice actor that can manage Re7YIELDDepositVault
     */
    bytes32 public constant RE7_YIELD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("RE7_YIELD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage Re7YIELDRedemptionVault
     */
    bytes32 public constant RE7_YIELD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("RE7_YIELD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage Re7YIELDCustomAggregatorFeed and Re7YIELDDataFeed
     */
    bytes32 public constant RE7_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("RE7_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
