// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MRe7SolMidasAccessControlRoles.sol";

/**
 * @title MRe7SolDepositVault
 * @notice Smart contract that handles mRE7SOL minting
 * @author RedDuck Software
 */
contract MRe7SolDepositVault is DepositVault, MRe7SolMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7SOL_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
