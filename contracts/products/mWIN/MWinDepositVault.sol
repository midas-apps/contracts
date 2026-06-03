// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MWinMidasAccessControlRoles.sol";

/**
 * @title MWinDepositVault
 * @notice Smart contract that handles mWIN minting
 * @author RedDuck Software
 */
contract MWinDepositVault is DepositVault, MWinMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_WIN_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
