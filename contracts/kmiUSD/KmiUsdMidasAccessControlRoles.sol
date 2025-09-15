// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title KmiUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for kmiUSD contracts
 * @author RedDuck Software
 */
abstract contract KmiUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage KmiUsdDepositVault
     */
    bytes32 public constant KMI_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("KMI_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KmiUsdRedemptionVault
     */
    bytes32 public constant KMI_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("KMI_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KmiUsdCustomAggregatorFeed and KmiUsdDataFeed
     */
    bytes32 public constant KMI_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("KMI_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
