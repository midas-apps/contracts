// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title QHVNMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for qHVN contracts
 * @author RedDuck Software
 */
abstract contract QHVNMidasAccessControlRoles {
    /**
     * @notice actor that can manage QHVNDepositVault
     */
    bytes32 public constant Q_HVN_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("Q_HVN_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage QHVNRedemptionVault
     */
    bytes32 public constant Q_HVN_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("Q_HVN_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage QHVNCustomAggregatorFeed and QHVNDataFeed
     */
    bytes32 public constant Q_HVN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("Q_HVN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for qHVN
     */
    bytes32 public constant Q_HVN_GREENLISTED_ROLE =
        keccak256("Q_HVN_GREENLISTED_ROLE");
}
