// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./QHVNMidasAccessControlRoles.sol";

/**
 * @title QHVNDepositVault
 * @notice Smart contract that handles qHVN minting
 * @author RedDuck Software
 */
contract QHVNDepositVault is DepositVault, QHVNMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return Q_HVN_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return Q_HVN_GREENLISTED_ROLE;
    }
}
