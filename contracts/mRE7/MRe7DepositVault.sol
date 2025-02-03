// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MRe7MidasAccessControlRoles.sol";

/**
 * @title MRe7DepositVault
 * @notice Smart contract that handles mRE7 minting
 * @author RedDuck Software
 */
contract MRe7DepositVault is DepositVault, MRe7MidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
