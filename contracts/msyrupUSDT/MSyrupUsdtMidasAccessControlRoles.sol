// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MSyrupUsdtMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for msyrupUSDT contracts
 * @author RedDuck Software
 */
abstract contract MSyrupUsdtMidasAccessControlRoles {
    /**
     * @notice actor that can manage MSyrupUsdtDepositVault
     */
    bytes32 public constant M_SYRUP_USDT_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_SYRUP_USDT_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSyrupUsdtRedemptionVault
     */
    bytes32 public constant M_SYRUP_USDT_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_SYRUP_USDT_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSyrupUsdtCustomAggregatorFeed and MSyrupUsdtDataFeed
     */
    bytes32 public constant M_SYRUP_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_SYRUP_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
