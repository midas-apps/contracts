// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MevBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mevBTC contracts
 * @author RedDuck Software
 */
abstract contract MevBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage MevBtcDepositVault
     */
    bytes32 public constant MEV_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("MEV_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MevBtcRedemptionVault
     */
    bytes32 public constant MEV_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("MEV_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MevBtcCustomAggregatorFeed and MevBtcDataFeed
     */
    bytes32 public constant MEV_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("MEV_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
