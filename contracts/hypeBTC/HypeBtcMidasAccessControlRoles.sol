// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title HypeBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for hypeBTC contracts
 * @author RedDuck Software
 */
abstract contract HypeBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage HypeBtcDepositVault
     */
    bytes32 public constant HYPE_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("HYPE_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HypeBtcRedemptionVault
     */
    bytes32 public constant HYPE_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("HYPE_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HypeBtcCustomAggregatorFeed and HypeBtcDataFeed
     */
    bytes32 public constant HYPE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("HYPE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
