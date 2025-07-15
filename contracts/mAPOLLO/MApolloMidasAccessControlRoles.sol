// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MApolloMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mAPOLLO contracts
 * @author RedDuck Software
 */
abstract contract MApolloMidasAccessControlRoles {
    /**
     * @notice actor that can manage MApolloDepositVault
     */
    bytes32 public constant M_APOLLO_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_APOLLO_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MApolloRedemptionVault
     */
    bytes32 public constant M_APOLLO_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_APOLLO_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MApolloCustomAggregatorFeed and MApolloDataFeed
     */
    bytes32 public constant M_APOLLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_APOLLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
