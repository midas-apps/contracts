// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./SplUsdMidasAccessControlRoles.sol";

/**
 * @title SplUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles splUSD redemptions
 * @author RedDuck Software
 */
contract SplUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    SplUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return SPL_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
