// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title KitUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for kitUSD contracts
 * @author RedDuck Software
 */
abstract contract KitUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage KitUsdDepositVault
     */
    bytes32 public constant KIT_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("KIT_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KitUsdRedemptionVault
     */
    bytes32 public constant KIT_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("KIT_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KitUsdCustomAggregatorFeed and KitUsdDataFeed
     */
    bytes32 public constant KIT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("KIT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
