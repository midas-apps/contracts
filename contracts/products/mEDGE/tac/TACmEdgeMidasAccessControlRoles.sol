// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TACmEdgeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for TACmEdge contracts
 * @author RedDuck Software
 */
abstract contract TACmEdgeMidasAccessControlRoles {
    /**
     * @notice actor that can manage TACmEdgeDepositVault
     */
    bytes32 public constant TAC_M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("TAC_M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TACmEdgeRedemptionVault
     */
    bytes32 public constant TAC_M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("TAC_M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE");
}
