// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./SGoldMidasAccessControlRoles.sol";

/**
 * @title SGoldDepositVault
 * @notice Smart contract that handles sGold minting
 * @author RedDuck Software
 */
contract SGoldDepositVault is DepositVault, SGoldMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return S_GOLD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
