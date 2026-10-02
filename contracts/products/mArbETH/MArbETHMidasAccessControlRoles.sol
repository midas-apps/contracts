// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MArbETHMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mArbETH contracts
 * @author RedDuck Software
 */
abstract contract MArbETHMidasAccessControlRoles {
    /**
     * @notice actor that can manage MArbETHDepositVault
     */
    bytes32 public constant M_ARB_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_ARB_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MArbETHRedemptionVault
     */
    bytes32 public constant M_ARB_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_ARB_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MArbETHCustomAggregatorFeed and MArbETHDataFeed
     */
    bytes32 public constant M_ARB_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_ARB_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mArbETH
     */
    bytes32 public constant M_ARB_GREENLISTED_ROLE =
        keccak256("M_ARB_GREENLISTED_ROLE");
}
