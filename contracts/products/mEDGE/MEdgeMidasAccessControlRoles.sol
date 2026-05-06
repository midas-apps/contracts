// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MEdgeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mEDGE contracts
 * @author RedDuck Software
 */
abstract contract MEdgeMidasAccessControlRoles {
    /**
     * @notice actor that can manage MEdgeDepositVault
     */
    bytes32 public constant M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MEdgeRedemptionVault
     */
    bytes32 public constant M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MEdgeCustomAggregatorFeed and MEdgeDataFeed
     */
    bytes32 public constant M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
