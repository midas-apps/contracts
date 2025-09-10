// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./MSyrupUsdtMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdtRedemptionVaultWithSwapper
 * @notice Smart contract that handles msyrupUSDT redemptions
 * @author RedDuck Software
 */
contract MSyrupUsdtRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
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
        return M_SYRUP_USDT_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
