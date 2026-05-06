// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title KitBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for kitBTC contracts
 * @author RedDuck Software
 */
abstract contract KitBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage KitBtcDepositVault
     */
    bytes32 public constant KIT_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("KIT_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KitBtcRedemptionVault
     */
    bytes32 public constant KIT_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("KIT_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KitBtcCustomAggregatorFeed and KitBtcDataFeed
     */
    bytes32 public constant KIT_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("KIT_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
