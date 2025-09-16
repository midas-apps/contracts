// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title ZeroGEthvMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for zeroGETHV contracts
 * @author RedDuck Software
 */
abstract contract ZeroGEthvMidasAccessControlRoles {
    /**
     * @notice actor that can manage ZeroGEthvDepositVault
     */
    bytes32 public constant ZEROG_ETHV_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("ZEROG_ETHV_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ZeroGEthvRedemptionVault
     */
    bytes32 public constant ZEROG_ETHV_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("ZEROG_ETHV_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage ZeroGEthvCustomAggregatorFeed and ZeroGEthvDataFeed
     */
    bytes32 public constant ZEROG_ETHV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("ZEROG_ETHV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
