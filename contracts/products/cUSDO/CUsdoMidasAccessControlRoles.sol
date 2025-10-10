// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title CUsdoMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for cUSDO contracts
 * @author RedDuck Software
 */
abstract contract CUsdoMidasAccessControlRoles {
    /**
     * @notice actor that can manage CUsdoDepositVault
     */
    bytes32 public constant C_USDO_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("C_USDO_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage CUsdoRedemptionVault
     */
    bytes32 public constant C_USDO_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("C_USDO_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage CUsdoCustomAggregatorFeed and CUsdoDataFeed
     */
    bytes32 public constant C_USDO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("C_USDO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
