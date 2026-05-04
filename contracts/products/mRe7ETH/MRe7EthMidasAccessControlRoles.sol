// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title MRe7EthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mRe7ETH contracts
 * @author RedDuck Software
 */
abstract contract MRe7EthMidasAccessControlRoles {
    /**
     * @notice actor that can manage MRe7EthDepositVault
     */
    bytes32 public constant M_RE7ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_RE7ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7EthRedemptionVault
     */
    bytes32 public constant M_RE7ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_RE7ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7EthCustomAggregatorFeed and MRe7EthDataFeed
     */
    bytes32 public constant M_RE7ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_RE7ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
