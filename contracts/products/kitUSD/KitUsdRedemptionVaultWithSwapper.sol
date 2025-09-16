// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./KitUsdMidasAccessControlRoles.sol";

/**
 * @title KitUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles kitUSD redemptions
 * @author RedDuck Software
 */
contract KitUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    KitUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KIT_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
