// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title DnEthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for dnETH contracts
 * @author RedDuck Software
 */
abstract contract DnEthMidasAccessControlRoles {
    /**
     * @notice actor that can manage DnEthDepositVault
     */
    bytes32 public constant DN_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("DN_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnEthRedemptionVault
     */
    bytes32 public constant DN_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("DN_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DnEthCustomAggregatorFeed and DnEthDataFeed
     */
    bytes32 public constant DN_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("DN_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
