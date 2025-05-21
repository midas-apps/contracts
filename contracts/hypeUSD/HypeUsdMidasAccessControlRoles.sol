// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title HypeUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for hypeUSD contracts
 * @author RedDuck Software
 */
abstract contract HypeUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage HypeUsdDepositVault
     */
    bytes32 public constant HYPE_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("HYPE_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HypeUsdRedemptionVault
     */
    bytes32 public constant HYPE_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("HYPE_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage HypeUsdCustomAggregatorFeed and HypeUsdDataFeed
     */
    bytes32 public constant HYPE_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("HYPE_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
