// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MRe7BtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mRE7BTC contracts
 * @author RedDuck Software
 */
abstract contract MRe7BtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage MRe7BtcDepositVault
     */
    bytes32 public constant M_RE7BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_RE7BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7BtcRedemptionVault
     */
    bytes32 public constant M_RE7BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_RE7BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MRe7BtcCustomAggregatorFeed and MRe7BtcDataFeed
     */
    bytes32 public constant M_RE7BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_RE7BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
