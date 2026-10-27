// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title SdvUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for sdvUSD contracts
 * @author RedDuck Software
 */
abstract contract SdvUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage SdvUsdDepositVault
     */
    bytes32 public constant SDV_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("SDV_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SdvUsdRedemptionVault
     */
    bytes32 public constant SDV_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("SDV_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SdvUsdCustomAggregatorFeed and SdvUsdDataFeed
     */
    bytes32 public constant SDV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("SDV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
