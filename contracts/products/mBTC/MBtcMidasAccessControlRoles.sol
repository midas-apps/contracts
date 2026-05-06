// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mBTC contracts
 * @author RedDuck Software
 */
abstract contract MBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage MBtcDepositVault
     */
    bytes32 public constant M_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MBtcRedemptionVault
     */
    bytes32 public constant M_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MBtcCustomAggregatorFeed and MBtcDataFeed
     */
    bytes32 public constant M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
