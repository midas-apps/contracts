// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MFOneMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mF-ONE contracts
 * @author RedDuck Software
 */
abstract contract MFOneMidasAccessControlRoles {
    /**
     * @notice actor that can manage MFOneDepositVault
     */
    bytes32 public constant M_FONE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_FONE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MFOneRedemptionVault
     */
    bytes32 public constant M_FONE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_FONE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MFOneCustomAggregatorFeed and MFOneDataFeed
     */
    bytes32 public constant M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
