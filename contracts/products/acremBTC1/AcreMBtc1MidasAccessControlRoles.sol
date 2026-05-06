// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title AcreMBtc1MidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for acremBTC1 contracts
 * @author RedDuck Software
 */
abstract contract AcreMBtc1MidasAccessControlRoles {
    /**
     * @notice actor that can manage AcreMBtc1DepositVault
     */
    bytes32 public constant ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage AcreMBtc1RedemptionVault
     */
    bytes32 public constant ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage AcreMBtc1CustomAggregatorFeed and AcreMBtc1DataFeed
     */
    bytes32 public constant ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
