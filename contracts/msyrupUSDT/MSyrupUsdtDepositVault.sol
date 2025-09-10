// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MSyrupUsdtMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdtDepositVault
 * @notice Smart contract that handles msyrupUSDT minting
 * @author RedDuck Software
 */
contract MSyrupUsdtDepositVault is
    DepositVault,
    MSyrupUsdtMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SYRUP_USDT_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
