// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title DnFartMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for dnFART contracts
 * @author RedDuck Software
 */
abstract contract DnFartMidasAccessControlRoles {
    /**
     * @notice actor that can manage DnFartDepositVault
     */
    bytes32 public constant DN_FART_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("DN_FART_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnFartRedemptionVault
     */
    bytes32 public constant DN_FART_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("DN_FART_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnFartCustomAggregatorFeed and DnFartDataFeed
     */
    bytes32 public constant DN_FART_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("DN_FART_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
