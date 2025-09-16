// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MHyperMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mHYPER contracts
 * @author RedDuck Software
 */
abstract contract MHyperMidasAccessControlRoles {
    /**
     * @notice actor that can manage MHyperDepositVault
     */
    bytes32 public constant M_HYPER_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_HYPER_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MHyperRedemptionVault
     */
    bytes32 public constant M_HYPER_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_HYPER_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MHyperCustomAggregatorFeed and MHyperDataFeed
     */
    bytes32 public constant M_HYPER_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_HYPER_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
