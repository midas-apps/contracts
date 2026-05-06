// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title HypeEthMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for hypeETH contracts
 * @author RedDuck Software
 */
abstract contract HypeEthMidasAccessControlRoles {
    /**
     * @notice actor that can manage HypeEthDepositVault
     */
    bytes32 public constant HYPE_ETH_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("HYPE_ETH_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HypeEthRedemptionVault
     */
    bytes32 public constant HYPE_ETH_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("HYPE_ETH_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HypeEthCustomAggregatorFeed and HypeEthDataFeed
     */
    bytes32 public constant HYPE_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("HYPE_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
