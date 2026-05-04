// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title MGlobalMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mGLOBAL contracts
 * @author RedDuck Software
 */
abstract contract MGlobalMidasAccessControlRoles {
    /**
     * @notice actor that can manage MGlobalDepositVault
     */
    bytes32 public constant M_GLOBAL_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_GLOBAL_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MGlobalRedemptionVault
     */
    bytes32 public constant M_GLOBAL_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_GLOBAL_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MGlobalCustomAggregatorFeed and MGlobalDataFeed
     */
    bytes32 public constant M_GLOBAL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_GLOBAL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mGLOBAL
     */
    bytes32 public constant M_GLOBAL_GREENLISTED_ROLE =
        keccak256("M_GLOBAL_GREENLISTED_ROLE");
}
