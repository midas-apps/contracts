// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MSyrupUsdMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdDepositVault
 * @notice Smart contract that handles msyrupUSD minting
 * @author RedDuck Software
 */
contract MSyrupUsdDepositVault is
    DepositVault,
    MSyrupUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SYRUP_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
