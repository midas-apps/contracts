// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TACmBtcMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for TACmBTC contracts
 * @author RedDuck Software
 */
abstract contract TACmBtcMidasAccessControlRoles {
    /**
     * @notice actor that can manage TACmBtcDepositVault
     */
    bytes32 public constant TAC_M_BTC_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("TAC_M_BTC_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TACmBtcRedemptionVault
     */
    bytes32 public constant TAC_M_BTC_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("TAC_M_BTC_REDEMPTION_VAULT_ADMIN_ROLE");
}
