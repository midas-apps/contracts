// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MAlphaMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mALPHA contracts
 * @author RedDuck Software
 */
abstract contract MAlphaMidasAccessControlRoles {
    /**
     * @notice actor that can manage MAlphaDepositVault
     */
    bytes32 public constant M_ALPHA_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_ALPHA_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MAlphaRedemptionVault
     */
    bytes32 public constant M_ALPHA_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_ALPHA_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MAlphaCustomAggregatorFeed and MAlphaDataFeed
     */
    bytes32 public constant M_ALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_ALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
