// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title BondUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for bondUSD contracts
 * @author RedDuck Software
 */
abstract contract BondUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage BondUsdDepositVault
     */
    bytes32 public constant BOND_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("BOND_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage BondUsdRedemptionVault
     */
    bytes32 public constant BOND_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("BOND_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage BondUsdCustomAggregatorFeed and BondUsdDataFeed
     */
    bytes32 public constant BOND_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("BOND_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
