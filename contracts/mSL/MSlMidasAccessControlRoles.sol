// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MSlMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mSL contracts
 * @author RedDuck Software
 */
abstract contract MSlMidasAccessControlRoles {
    /**
     * @notice actor that can manage MSlDepositVault
     */
    bytes32 public constant M_SL_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_SL_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSlRedemptionVault
     */
    bytes32 public constant M_SL_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_SL_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSlCustomAggregatorFeed and MSlDataFeed
     */
    bytes32 public constant M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
