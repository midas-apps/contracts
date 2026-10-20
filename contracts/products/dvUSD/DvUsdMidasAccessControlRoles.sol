// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title DvUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for dvUSD contracts
 * @author RedDuck Software
 */
abstract contract DvUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage DvUsdDepositVault
     */
    bytes32 public constant DV_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("DV_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DvUsdRedemptionVault
     */
    bytes32 public constant DV_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("DV_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage DvUsdCustomAggregatorFeed and DvUsdDataFeed
     */
    bytes32 public constant DV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("DV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
