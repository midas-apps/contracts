// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MM1BtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mM1BTC contracts
 * @author RedDuck Software
 */
abstract contract MM1BtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage MM1BtcDepositVault
     */
    bytes32 public constant M_M1_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_M1_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MM1BtcRedemptionVault
     */
    bytes32 public constant M_M1_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_M1_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MM1BtcCustomAggregatorFeed and MM1BtcDataFeed
     */
    bytes32 public constant M_M1_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_M1_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
