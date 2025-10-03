// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MEvUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mEVUSD contracts
 * @author RedDuck Software
 */
abstract contract MEvUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage MEvUsdDepositVault
     */
    bytes32 public constant M_EV_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_EV_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MEvUsdRedemptionVault
     */
    bytes32 public constant M_EV_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_EV_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MEvUsdCustomAggregatorFeed and MEvUsdDataFeed
     */
    bytes32 public constant M_EV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_EV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
