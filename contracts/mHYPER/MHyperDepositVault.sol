// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MHyperMidasAccessControlRoles.sol";

/**
 * @title MHyperDepositVault
 * @notice Smart contract that handles mHYPER minting
 * @author RedDuck Software
 */
contract MHyperDepositVault is DepositVault, MHyperMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_HYPER_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
