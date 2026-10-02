// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MArbBTCMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mArbBTC contracts
 * @author RedDuck Software
 */
abstract contract MArbBTCMidasAccessControlRoles {
    /**
     * @notice actor that can manage MArbBTCDepositVault
     */
    bytes32 public constant M_ARB_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_ARB_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MArbBTCRedemptionVault
     */
    bytes32 public constant M_ARB_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_ARB_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MArbBTCCustomAggregatorFeed and MArbBTCDataFeed
     */
    bytes32 public constant M_ARB_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_ARB_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mArbBTC
     */
    bytes32 public constant M_ARB_GREENLISTED_ROLE =
        keccak256("M_ARB_GREENLISTED_ROLE");
}
