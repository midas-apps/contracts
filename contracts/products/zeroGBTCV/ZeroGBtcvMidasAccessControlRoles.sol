// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title ZeroGBtcvMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for zeroGBTCV contracts
 * @author RedDuck Software
 */
abstract contract ZeroGBtcvMidasAccessControlRoles {
    /**
     * @notice actor that can manage ZeroGBtcvDepositVault
     */
    bytes32 public constant ZEROG_BTCV_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("ZEROG_BTCV_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ZeroGBtcvRedemptionVault
     */
    bytes32 public constant ZEROG_BTCV_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("ZEROG_BTCV_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ZeroGBtcvCustomAggregatorFeed and ZeroGBtcvDataFeed
     */
    bytes32 public constant ZEROG_BTCV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("ZEROG_BTCV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
