// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TUsdeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for tUSDe contracts
 * @author RedDuck Software
 */
abstract contract TUsdeMidasAccessControlRoles {
    /**
     * @notice actor that can manage TUsdeDepositVault
     */
    bytes32 public constant T_USDE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("T_USDE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TUsdeRedemptionVault
     */
    bytes32 public constant T_USDE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("T_USDE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TUsdeCustomAggregatorFeed and TUsdeDataFeed
     */
    bytes32 public constant T_USDE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("T_USDE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
