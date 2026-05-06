// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MSyrupUsdpMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdpDepositVault
 * @notice Smart contract that handles msyrupUSDp minting
 * @author RedDuck Software
 */
contract MSyrupUsdpDepositVault is
    DepositVault,
    MSyrupUsdpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SYRUP_USDP_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
