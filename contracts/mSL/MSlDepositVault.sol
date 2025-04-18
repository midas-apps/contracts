// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MSlMidasAccessControlRoles.sol";

/**
 * @title MSlDepositVault
 * @notice Smart contract that handles mSL minting
 * @author RedDuck Software
 */
contract MSlDepositVault is DepositVault, MSlMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SL_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
