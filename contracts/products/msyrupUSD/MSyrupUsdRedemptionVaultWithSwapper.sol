// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MSyrupUsdMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles msyrupUSD redemptions
 * @author RedDuck Software
 */
contract MSyrupUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
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
        return M_SYRUP_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
