// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MWinMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mWIN contracts
 * @author RedDuck Software
 */
abstract contract MWinMidasAccessControlRoles {
    /**
     * @notice actor that can manage MWinDepositVault
     */
    bytes32 public constant M_WIN_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_WIN_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MWinRedemptionVault
     */
    bytes32 public constant M_WIN_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_WIN_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MWinCustomAggregatorFeed and MWinDataFeed
     */
    bytes32 public constant M_WIN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_WIN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mWIN
     */
    bytes32 public constant M_WIN_GREENLISTED_ROLE =
        keccak256("M_WIN_GREENLISTED_ROLE");
}
