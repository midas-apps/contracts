// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title BondBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for bondBTC contracts
 * @author RedDuck Software
 */
abstract contract BondBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage BondBtcDepositVault
     */
    bytes32 public constant BOND_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("BOND_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage BondBtcRedemptionVault
     */
    bytes32 public constant BOND_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("BOND_BTC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage BondBtcCustomAggregatorFeed and BondBtcDataFeed
     */
    bytes32 public constant BOND_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("BOND_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
