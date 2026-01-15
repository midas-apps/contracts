// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title SLInjMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for sLINJ contracts
 * @author RedDuck Software
 */
abstract contract SLInjMidasAccessControlRoles {
    /**
     * @notice actor that can manage SLInjDepositVault
     */
    bytes32 public constant SL_INJ_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("SL_INJ_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SLInjRedemptionVault
     */
    bytes32 public constant SL_INJ_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("SL_INJ_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage SLInjCustomAggregatorFeed and SLInjDataFeed
     */
    bytes32 public constant SL_INJ_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("SL_INJ_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
