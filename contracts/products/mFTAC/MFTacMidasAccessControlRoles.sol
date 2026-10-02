// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MFTacMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mFTAC contracts
 * @author RedDuck Software
 */
abstract contract MFTacMidasAccessControlRoles {
    /**
     * @notice actor that can manage MFTacDepositVault
     */
    bytes32 public constant M_FTAC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_FTAC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MFTacRedemptionVault
     */
    bytes32 public constant M_FTAC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_FTAC_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MFTacCustomAggregatorFeed and MFTacDataFeed
     */
    bytes32 public constant M_FTAC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_FTAC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for mFTAC
     */
    bytes32 public constant M_GLOBAL_GREENLISTED_ROLE =
        keccak256("M_GLOBAL_GREENLISTED_ROLE");
}
