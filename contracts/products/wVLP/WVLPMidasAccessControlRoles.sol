// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title WVLPMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for wVLP contracts
 * @author RedDuck Software
 */
abstract contract WVLPMidasAccessControlRoles {
    /**
     * @notice actor that can manage WVLPDepositVault
     */
    bytes32 public constant W_VLP_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("W_VLP_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage WVLPRedemptionVault
     */
    bytes32 public constant W_VLP_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("W_VLP_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage WVLPCustomAggregatorFeed and WVLPDataFeed
     */
    bytes32 public constant W_VLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("W_VLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
