// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title DnHypeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for dnHYPE contracts
 * @author RedDuck Software
 */
abstract contract DnHypeMidasAccessControlRoles {
    /**
     * @notice actor that can manage DnHypeDepositVault
     */
    bytes32 public constant DN_HYPE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("DN_HYPE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnHypeRedemptionVault
     */
    bytes32 public constant DN_HYPE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("DN_HYPE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnHypeCustomAggregatorFeed and DnHypeDataFeed
     */
    bytes32 public constant DN_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("DN_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
