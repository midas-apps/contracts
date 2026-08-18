// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MGloEuroMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mGLOeuro contracts
 * @author RedDuck Software
 */
abstract contract MGloEuroMidasAccessControlRoles {
    /**
     * @notice actor that can manage MGloEuroDepositVault
     */
    bytes32 public constant M_GLO_EURO_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_GLO_EURO_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MGloEuroRedemptionVault
     */
    bytes32 public constant M_GLO_EURO_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_GLO_EURO_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MGloEuroCustomAggregatorFeed and MGloEuroDataFeed
     */
    bytes32 public constant M_GLO_EURO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_GLO_EURO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mGLOeuro
     */
    bytes32 public constant M_GLOBAL_GREENLISTED_ROLE =
        keccak256("M_GLOBAL_GREENLISTED_ROLE");
}
