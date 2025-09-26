// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./TacTonMidasAccessControlRoles.sol";

/**
 * @title TacTonDepositVault
 * @notice Smart contract that handles tacTON minting
 * @author RedDuck Software
 */
contract TacTonDepositVault is DepositVault, TacTonMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_TON_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
