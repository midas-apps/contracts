// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TacTonMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for tacTON contracts
 * @author RedDuck Software
 */
abstract contract TacTonMidasAccessControlRoles {
    /**
     * @notice actor that can manage TacTonDepositVault
     */
    bytes32 public constant TAC_TON_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("TAC_TON_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TacTonRedemptionVault
     */
    bytes32 public constant TAC_TON_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("TAC_TON_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TacTonCustomAggregatorFeed and TacTonDataFeed
     */
    bytes32 public constant TAC_TON_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("TAC_TON_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
