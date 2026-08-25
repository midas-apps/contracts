// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MArbMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mArb contracts
 * @author RedDuck Software
 */
abstract contract MArbMidasAccessControlRoles {
    /**
     * @notice actor that can manage MArbDepositVault
     */
    bytes32 public constant M_ARB_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_ARB_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MArbRedemptionVault
     */
    bytes32 public constant M_ARB_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_ARB_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MArbCustomAggregatorFeed and MArbDataFeed
     */
    bytes32 public constant M_ARB_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_ARB_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mArb
     */
    bytes32 public constant M_ARB_GREENLISTED_ROLE =
        keccak256("M_ARB_GREENLISTED_ROLE");
}
