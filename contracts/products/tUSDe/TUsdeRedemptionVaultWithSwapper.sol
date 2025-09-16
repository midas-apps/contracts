// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./TUsdeMidasAccessControlRoles.sol";

/**
 * @title TUsdeRedemptionVaultWithSwapper
 * @notice Smart contract that handles tUSDe redemptions
 * @author RedDuck Software
 */
contract TUsdeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    TUsdeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return T_USDE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
