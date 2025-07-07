// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MRe7SolMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mRE7SOL contracts
 * @author RedDuck Software
 */
abstract contract MRe7SolMidasAccessControlRoles {
    /**
     * @notice actor that can manage MRe7SolDepositVault
     */
    bytes32 public constant M_RE7SOL_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_RE7SOL_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7SolRedemptionVault
     */
    bytes32 public constant M_RE7SOL_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_RE7SOL_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7SolCustomAggregatorFeed and MRe7SolDataFeed
     */
    bytes32 public constant M_RE7SOL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_RE7SOL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
