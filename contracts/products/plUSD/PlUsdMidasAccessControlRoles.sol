// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title PlUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for plUSD contracts
 * @author RedDuck Software
 */
abstract contract PlUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage PlUsdDepositVault
     */
    bytes32 public constant PL_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("PL_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage PlUsdRedemptionVault
     */
    bytes32 public constant PL_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("PL_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage PlUsdCustomAggregatorFeed and PlUsdDataFeed
     */
    bytes32 public constant PL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("PL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
