// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title BondEthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for bondETH contracts
 * @author RedDuck Software
 */
abstract contract BondEthMidasAccessControlRoles {
    /**
     * @notice actor that can manage BondEthDepositVault
     */
    bytes32 public constant BOND_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("BOND_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage BondEthRedemptionVault
     */
    bytes32 public constant BOND_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("BOND_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage BondEthCustomAggregatorFeed and BondEthDataFeed
     */
    bytes32 public constant BOND_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("BOND_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
