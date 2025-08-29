// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MSyrupUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for msyrupUSD contracts
 * @author RedDuck Software
 */
abstract contract MSyrupUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage MSyrupUsdDepositVault
     */
    bytes32 public constant M_SYRUP_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_SYRUP_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSyrupUsdRedemptionVault
     */
    bytes32 public constant M_SYRUP_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_SYRUP_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MSyrupUsdCustomAggregatorFeed and MSyrupUsdDataFeed
     */
    bytes32 public constant M_SYRUP_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_SYRUP_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
