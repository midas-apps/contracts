// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MMevMidasAccessControlRoles.sol";

/**
 * @title MMevDepositVault
 * @notice Smart contract that handles mMEV minting
 * @author RedDuck Software
 */
contract MMevDepositVault is DepositVault, MMevMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_MEV_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
