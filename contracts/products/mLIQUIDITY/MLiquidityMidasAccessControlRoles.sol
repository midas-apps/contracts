// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MLiquidityMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mLIQUIDITY contracts
 * @author RedDuck Software
 */
abstract contract MLiquidityMidasAccessControlRoles {
    /**
     * @notice actor that can manage MLiquidityDepositVault
     */
    bytes32 public constant M_LIQUIDITY_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_LIQUIDITY_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MLiquidityRedemptionVault
     */
    bytes32 public constant M_LIQUIDITY_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_LIQUIDITY_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MLiquidityCustomAggregatorFeed and MLiquidityDataFeed
     */
    bytes32 public constant M_LIQUIDITY_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_LIQUIDITY_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
