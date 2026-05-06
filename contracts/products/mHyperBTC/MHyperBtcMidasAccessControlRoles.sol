// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MHyperBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mHyperBTC contracts
 * @author RedDuck Software
 */
abstract contract MHyperBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage MHyperBtcDepositVault
     */
    bytes32 public constant M_HYPER_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_HYPER_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MHyperBtcRedemptionVault
     */
    bytes32 public constant M_HYPER_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_HYPER_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MHyperBtcCustomAggregatorFeed and MHyperBtcDataFeed
     */
    bytes32 public constant M_HYPER_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_HYPER_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
