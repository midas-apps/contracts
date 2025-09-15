// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./DnHypeMidasAccessControlRoles.sol";

/**
 * @title DnHypeDepositVault
 * @notice Smart contract that handles dnHYPE minting
 * @author RedDuck Software
 */
contract DnHypeDepositVault is DepositVault, DnHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_HYPE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
