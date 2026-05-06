// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title SplUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for splUSD contracts
 * @author RedDuck Software
 */
abstract contract SplUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage SplUsdDepositVault
     */
    bytes32 public constant SPL_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("SPL_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SplUsdRedemptionVault
     */
    bytes32 public constant SPL_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("SPL_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SplUsdCustomAggregatorFeed and SplUsdDataFeed
     */
    bytes32 public constant SPL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("SPL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
