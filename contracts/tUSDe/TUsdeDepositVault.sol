// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./TUsdeMidasAccessControlRoles.sol";

/**
 * @title TUsdeDepositVault
 * @notice Smart contract that handles tUSDe minting
 * @author RedDuck Software
 */
contract TUsdeDepositVault is DepositVault, TUsdeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return T_USDE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
