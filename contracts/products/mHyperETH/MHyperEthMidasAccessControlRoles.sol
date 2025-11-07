// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MHyperEthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mHyperETH contracts
 * @author RedDuck Software
 */
abstract contract MHyperEthMidasAccessControlRoles {
    /**
     * @notice actor that can manage MHyperEthDepositVault
     */
    bytes32 public constant M_HYPER_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_HYPER_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MHyperEthRedemptionVault
     */
    bytes32 public constant M_HYPER_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_HYPER_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MHyperEthCustomAggregatorFeed and MHyperEthDataFeed
     */
    bytes32 public constant M_HYPER_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_HYPER_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
