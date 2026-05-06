// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TEthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for tETH contracts
 * @author RedDuck Software
 */
abstract contract TEthMidasAccessControlRoles {
    /**
     * @notice actor that can manage TEthDepositVault
     */
    bytes32 public constant T_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("T_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TEthRedemptionVault
     */
    bytes32 public constant T_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("T_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TEthCustomAggregatorFeed and TEthDataFeed
     */
    bytes32 public constant T_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("T_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
