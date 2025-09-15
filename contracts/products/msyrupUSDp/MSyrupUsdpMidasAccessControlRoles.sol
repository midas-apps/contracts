// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MSyrupUsdpMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for msyrupUSDp contracts
 * @author RedDuck Software
 */
abstract contract MSyrupUsdpMidasAccessControlRoles {
    /**
     * @notice actor that can manage MSyrupUsdpDepositVault
     */
    bytes32 public constant M_SYRUP_USDP_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_SYRUP_USDP_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSyrupUsdpRedemptionVault
     */
    bytes32 public constant M_SYRUP_USDP_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_SYRUP_USDP_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSyrupUsdpCustomAggregatorFeed and MSyrupUsdpDataFeed
     */
    bytes32 public constant M_SYRUP_USDP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_SYRUP_USDP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
