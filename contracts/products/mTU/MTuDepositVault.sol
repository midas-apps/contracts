// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../DepositVault.sol";
import "./MTuMidasAccessControlRoles.sol";

/**
 * @title MTuDepositVault
 * @notice Smart contract that handles mTU minting
 * @author RedDuck Software
 */
contract MTuDepositVault is DepositVault, MTuMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_TU_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
