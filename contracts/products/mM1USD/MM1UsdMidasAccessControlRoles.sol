// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MM1UsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mM1USD contracts
 * @author RedDuck Software
 */
abstract contract MM1UsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage MM1UsdDepositVault
     */
    bytes32 public constant M_M1_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_M1_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MM1UsdRedemptionVault
     */
    bytes32 public constant M_M1_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_M1_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MM1UsdCustomAggregatorFeed and MM1UsdDataFeed
     */
    bytes32 public constant M_M1_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_M1_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
