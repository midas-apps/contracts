// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MoriniBTCYieldMidasAccessControlRoles.sol";

/**
 * @title MoriniBTCYieldDepositVault
 * @notice Smart contract that handles moriniBTCYield minting
 * @author RedDuck Software
 */
contract MoriniBTCYieldDepositVault is
    DepositVault,
    MoriniBTCYieldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return MORINI_BTC_YIELD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
