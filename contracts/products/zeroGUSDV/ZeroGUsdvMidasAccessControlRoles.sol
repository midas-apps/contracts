// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title ZeroGUsdvMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for zeroGUSDV contracts
 * @author RedDuck Software
 */
abstract contract ZeroGUsdvMidasAccessControlRoles {
    /**
     * @notice actor that can manage ZeroGUsdvDepositVault
     */
    bytes32 public constant ZEROG_USDV_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("ZEROG_USDV_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ZeroGUsdvRedemptionVault
     */
    bytes32 public constant ZEROG_USDV_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("ZEROG_USDV_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ZeroGUsdvCustomAggregatorFeed and ZeroGUsdvDataFeed
     */
    bytes32 public constant ZEROG_USDV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("ZEROG_USDV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
