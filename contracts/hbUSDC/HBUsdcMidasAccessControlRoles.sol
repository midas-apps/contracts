// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title HBUsdcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for hbUSDC contracts
 * @author RedDuck Software
 */
abstract contract HBUsdcMidasAccessControlRoles {
    /**
     * @notice actor that can manage HBUsdcDepositVault
     */
    bytes32 public constant HB_USDC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("HB_USDC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HBUsdcRedemptionVault
     */
    bytes32 public constant HB_USDC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("HB_USDC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HBUsdcCustomAggregatorFeed and HBUsdcDataFeed
     */
    bytes32 public constant HB_USDC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("HB_USDC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
