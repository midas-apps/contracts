// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MRoxMidasAccessControlRoles.sol";

/**
 * @title MRoxDepositVault
 * @notice Smart contract that handles mROX minting
 * @author RedDuck Software
 */
contract MRoxDepositVault is DepositVault, MRoxMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ROX_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
