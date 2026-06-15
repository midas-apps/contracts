// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MGloMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mGLO contracts
 * @author RedDuck Software
 */
abstract contract MGloMidasAccessControlRoles {
    /**
     * @notice actor that can manage MGloDepositVault
     */
    bytes32 public constant M_GLO_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_GLO_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MGloRedemptionVault
     */
    bytes32 public constant M_GLO_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_GLO_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MGloCustomAggregatorFeed and MGloDataFeed
     */
    bytes32 public constant M_GLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_GLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mGLO
     */
    bytes32 public constant M_GLOBAL_GREENLISTED_ROLE =
        keccak256("M_GLOBAL_GREENLISTED_ROLE");
}
