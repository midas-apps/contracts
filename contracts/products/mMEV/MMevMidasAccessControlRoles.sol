// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MMevMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mMEV contracts
 * @author RedDuck Software
 */
abstract contract MMevMidasAccessControlRoles {
    /**
     * @notice actor that can manage MMevDepositVault
     */
    bytes32 public constant M_MEV_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_MEV_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MMevRedemptionVault
     */
    bytes32 public constant M_MEV_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_MEV_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MMevCustomAggregatorFeed and MMevDataFeed
     */
    bytes32 public constant M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
