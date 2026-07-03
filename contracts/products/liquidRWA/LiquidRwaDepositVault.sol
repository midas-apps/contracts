// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./LiquidRwaMidasAccessControlRoles.sol";

/**
 * @title LiquidRwaDepositVault
 * @notice Smart contract that handles liquidRWA minting
 * @author RedDuck Software
 */
contract LiquidRwaDepositVault is
    DepositVault,
    LiquidRwaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_RWA_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
