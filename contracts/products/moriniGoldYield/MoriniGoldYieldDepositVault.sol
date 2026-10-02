// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MoriniGoldYieldMidasAccessControlRoles.sol";

/**
 * @title MoriniGoldYieldDepositVault
 * @notice Smart contract that handles moriniGoldYield minting
 * @author RedDuck Software
 */
contract MoriniGoldYieldDepositVault is
    DepositVault,
    MoriniGoldYieldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return MORINI_GOLD_YIELD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
