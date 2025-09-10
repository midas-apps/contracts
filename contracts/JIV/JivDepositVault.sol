// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./JivMidasAccessControlRoles.sol";

/**
 * @title JivDepositVault
 * @notice Smart contract that handles JIV minting
 * @author RedDuck Software
 */
contract JivDepositVault is DepositVault, JivMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return JIV_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
