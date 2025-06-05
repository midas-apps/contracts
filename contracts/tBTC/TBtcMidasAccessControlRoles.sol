// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for tBTC contracts
 * @author RedDuck Software
 */
abstract contract TBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage TBtcDepositVault
     */
    bytes32 public constant T_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("T_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TBtcRedemptionVault
     */
    bytes32 public constant T_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("T_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TBtcCustomAggregatorFeed and TBtcDataFeed
     */
    bytes32 public constant T_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("T_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
