// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MTuMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mTU contracts
 * @author RedDuck Software
 */
abstract contract MTuMidasAccessControlRoles {
    /**
     * @notice actor that can manage MTuDepositVault
     */
    bytes32 public constant M_TU_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_TU_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MTuRedemptionVault
     */
    bytes32 public constant M_TU_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_TU_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MTuCustomAggregatorFeed and MTuDataFeed
     */
    bytes32 public constant M_TU_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_TU_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
