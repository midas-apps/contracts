// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MRoxMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mROX contracts
 * @author RedDuck Software
 */
abstract contract MRoxMidasAccessControlRoles {
    /**
     * @notice actor that can manage MRoxDepositVault
     */
    bytes32 public constant M_ROX_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_ROX_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRoxRedemptionVault
     */
    bytes32 public constant M_ROX_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_ROX_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRoxCustomAggregatorFeed and MRoxDataFeed
     */
    bytes32 public constant M_ROX_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_ROX_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
