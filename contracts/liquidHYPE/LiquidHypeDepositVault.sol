// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./LiquidHypeMidasAccessControlRoles.sol";

/**
 * @title LiquidHypeDepositVault
 * @notice Smart contract that handles liquidHYPE minting
 * @author RedDuck Software
 */
contract LiquidHypeDepositVault is
    DepositVault,
    LiquidHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_HYPE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
