// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MKRalphaMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mKRalpha contracts
 * @author RedDuck Software
 */
abstract contract MKRalphaMidasAccessControlRoles {
    /**
     * @notice actor that can manage MKRalphaDepositVault
     */
    bytes32 public constant M_KRALPHA_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_KRALPHA_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MKRalphaRedemptionVault
     */
    bytes32 public constant M_KRALPHA_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_KRALPHA_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MKRalphaCustomAggregatorFeed and MKRalphaDataFeed
     */
    bytes32 public constant M_KRALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_KRALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
