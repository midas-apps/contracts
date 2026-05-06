// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./HBXautMidasAccessControlRoles.sol";

/**
 * @title HBXautDepositVault
 * @notice Smart contract that handles hbXAUt minting
 * @author RedDuck Software
 */
contract HBXautDepositVault is DepositVault, HBXautMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HB_XAUT_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
