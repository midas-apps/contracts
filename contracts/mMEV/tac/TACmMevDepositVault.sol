// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./TACmMevMidasAccessControlRoles.sol";

/**
 * @title TACmMevDepositVault
 * @notice Smart contract that handles TACmMEV minting
 * @author RedDuck Software
 */
contract TACmMevDepositVault is DepositVault, TACmMevMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_M_MEV_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
