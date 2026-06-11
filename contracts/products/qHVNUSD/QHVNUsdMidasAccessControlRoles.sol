// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title QHVNUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for qHVNUSD contracts
 * @author RedDuck Software
 */
abstract contract QHVNUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage QHVNUsdDepositVault
     */
    bytes32 public constant Q_HVN_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("Q_HVN_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage QHVNUsdRedemptionVault
     */
    bytes32 public constant Q_HVN_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("Q_HVN_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage QHVNUsdCustomAggregatorFeed and QHVNUsdDataFeed
     */
    bytes32 public constant Q_HVN_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("Q_HVN_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @notice greenlist role for qHVNUSD
     */
    bytes32 public constant Q_HVN_USD_GREENLISTED_ROLE =
        keccak256("Q_HVN_USD_GREENLISTED_ROLE");
}
