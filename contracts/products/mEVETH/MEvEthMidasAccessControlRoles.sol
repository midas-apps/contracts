// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MEvEthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mEVETH contracts
 * @author RedDuck Software
 */
abstract contract MEvEthMidasAccessControlRoles {
    /**
     * @notice actor that can manage MEvEthDepositVault
     */
    bytes32 public constant M_EV_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_EV_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MEvEthRedemptionVault
     */
    bytes32 public constant M_EV_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_EV_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MEvEthCustomAggregatorFeed and MEvEthDataFeed
     */
    bytes32 public constant M_EV_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_EV_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
