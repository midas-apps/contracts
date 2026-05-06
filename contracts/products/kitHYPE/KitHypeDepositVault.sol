// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./KitHypeMidasAccessControlRoles.sol";

/**
 * @title KitHypeDepositVault
 * @notice Smart contract that handles kitHYPE minting
 * @author RedDuck Software
 */
contract KitHypeDepositVault is DepositVault, KitHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KIT_HYPE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
