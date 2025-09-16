// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MFarmMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mFARM contracts
 * @author RedDuck Software
 */
abstract contract MFarmMidasAccessControlRoles {
    /**
     * @notice actor that can manage MFarmDepositVault
     */
    bytes32 public constant M_FARM_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_FARM_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MFarmRedemptionVault
     */
    bytes32 public constant M_FARM_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_FARM_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MFarmCustomAggregatorFeed and MFarmDataFeed
     */
    bytes32 public constant M_FARM_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_FARM_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
