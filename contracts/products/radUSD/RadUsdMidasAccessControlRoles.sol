// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title RadUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for radUSD contracts
 * @author RedDuck Software
 */
abstract contract RadUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage RadUsdDepositVault
     */
    bytes32 public constant RAD_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("RAD_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage RadUsdRedemptionVault
     */
    bytes32 public constant RAD_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("RAD_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage RadUsdCustomAggregatorFeed and RadUsdDataFeed
     */
    bytes32 public constant RAD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("RAD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for radUSD
     */
    bytes32 public constant RADIAL_GREENLISTED_ROLE =
        keccak256("RADIAL_GREENLISTED_ROLE");
}
