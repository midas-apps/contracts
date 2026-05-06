// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title WNlpMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for wNLP contracts
 * @author RedDuck Software
 */
abstract contract WNlpMidasAccessControlRoles {
    /**
     * @notice actor that can manage WNlpDepositVault
     */
    bytes32 public constant W_NLP_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("W_NLP_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage WNlpRedemptionVault
     */
    bytes32 public constant W_NLP_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("W_NLP_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage WNlpCustomAggregatorFeed and WNlpDataFeed
     */
    bytes32 public constant W_NLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("W_NLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
