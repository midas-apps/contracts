// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title EUsdMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for eUSD contracts
 * @author RedDuck Software
 */
abstract contract EUsdMidasAccessControlRoles {
    /**
     * @notice actor that can manage vault admin roles
     */
    bytes32 public constant E_USD_VAULT_ROLES_OPERATOR =
        keccak256("E_USD_VAULT_ROLES_OPERATOR");

    /**
     * @notice actor that can manage EUsdDepositVault
     */
    bytes32 public constant E_USD_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("E_USD_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage EUsdRedemptionVault
     */
    bytes32 public constant E_USD_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("E_USD_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can change eUSD green list statuses of addresses
     */
    bytes32 public constant E_USD_GREENLIST_OPERATOR_ROLE =
        keccak256("E_USD_GREENLIST_OPERATOR_ROLE");

    /**
     * @notice actor that is greenlisted in eUSD
     */
    bytes32 public constant E_USD_GREENLISTED_ROLE =
        keccak256("E_USD_GREENLISTED_ROLE");
}
