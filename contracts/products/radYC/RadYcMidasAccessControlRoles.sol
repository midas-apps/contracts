// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title RadYcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for radYC contracts
 * @author RedDuck Software
 */
abstract contract RadYcMidasAccessControlRoles {
    /**
     * @notice actor that can manage RadYcDepositVault
     */
    bytes32 public constant RAD_YC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("RAD_YC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage RadYcRedemptionVault
     */
    bytes32 public constant RAD_YC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("RAD_YC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage RadYcCustomAggregatorFeed and RadYcDataFeed
     */
    bytes32 public constant RAD_YC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("RAD_YC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for radYC
     */
    bytes32 public constant RADIAL_GREENLISTED_ROLE =
        keccak256("RADIAL_GREENLISTED_ROLE");
}
