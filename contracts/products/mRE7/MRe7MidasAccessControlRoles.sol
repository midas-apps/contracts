// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MRe7MidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mRE7 contracts
 * @author RedDuck Software
 */
abstract contract MRe7MidasAccessControlRoles {
    /**
     * @notice actor that can manage MRe7DepositVault
     */
    bytes32 public constant M_RE7_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_RE7_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7RedemptionVault
     */
    bytes32 public constant M_RE7_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_RE7_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7CustomAggregatorFeed and MRe7DataFeed
     */
    bytes32 public constant M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
