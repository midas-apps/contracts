// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./LiquidDefiMidasAccessControlRoles.sol";

/**
 * @title LiquidDefiDepositVault
 * @notice Smart contract that handles liquidDeFi minting
 * @author RedDuck Software
 */
contract LiquidDefiDepositVault is
    DepositVault,
    LiquidDefiMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_DEFI_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
