// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TACmMevMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for TACmMEV contracts
 * @author RedDuck Software
 */
abstract contract TACmMevMidasAccessControlRoles {
    /**
     * @notice actor that can manage TACmMevDepositVault
     */
    bytes32 public constant TAC_M_MEV_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("TAC_M_MEV_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TACmMevRedemptionVault
     */
    bytes32 public constant TAC_M_MEV_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("TAC_M_MEV_REDEMPTION_VAULT_ADMIN_ROLE");
}
