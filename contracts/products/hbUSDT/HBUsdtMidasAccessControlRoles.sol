// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title HBUsdtMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for hbUSDT contracts
 * @author RedDuck Software
 */
abstract contract HBUsdtMidasAccessControlRoles {
    /**
     * @notice actor that can manage HBUsdtDepositVault
     */
    bytes32 public constant HB_USDT_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("HB_USDT_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HBUsdtRedemptionVault
     */
    bytes32 public constant HB_USDT_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("HB_USDT_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HBUsdtCustomAggregatorFeed and HBUsdtDataFeed
     */
    bytes32 public constant HB_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("HB_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
