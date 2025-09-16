// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title AcreBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for acreBTC contracts
 * @author RedDuck Software
 */
abstract contract AcreBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage AcreBtcDepositVault
     */
    bytes32 public constant ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage AcreBtcRedemptionVault
     */
    bytes32 public constant ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage AcreBtcCustomAggregatorFeed and AcreBtcDataFeed
     */
    bytes32 public constant ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
