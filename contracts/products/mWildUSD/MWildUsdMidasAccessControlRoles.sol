// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MWildUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mWildUSD contracts
 * @author RedDuck Software
 */
abstract contract MWildUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage MWildUsdDepositVault
     */
    bytes32 public constant M_WILD_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_WILD_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MWildUsdRedemptionVault
     */
    bytes32 public constant M_WILD_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_WILD_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MWildUsdCustomAggregatorFeed and MWildUsdDataFeed
     */
    bytes32 public constant M_WILD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_WILD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
