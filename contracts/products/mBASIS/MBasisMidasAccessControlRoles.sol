// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MBasisMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mBASIS contracts
 * @author RedDuck Software
 */
abstract contract MBasisMidasAccessControlRoles {
    /**
     * @notice actor that can manage MBasisDepositVault
     */
    bytes32 public constant M_BASIS_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_BASIS_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MBasisRedemptionVault
     */
    bytes32 public constant M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MBasisCustomAggregatorFeed and MBasisDataFeed
     */
    bytes32 public constant M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
