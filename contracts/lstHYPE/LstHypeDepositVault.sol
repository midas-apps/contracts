// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./LstHypeMidasAccessControlRoles.sol";

/**
 * @title LstHypeDepositVault
 * @notice Smart contract that handles LstHype minting
 * @author RedDuck Software
 */
contract LstHypeDepositVault is DepositVault, LstHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LST_HYPE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
