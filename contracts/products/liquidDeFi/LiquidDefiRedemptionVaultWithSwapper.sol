// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./LiquidDefiMidasAccessControlRoles.sol";

/**
 * @title LiquidDefiRedemptionVaultWithSwapper
 * @notice Smart contract that handles liquidDeFi redemptions
 * @author RedDuck Software
 */
contract LiquidDefiRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    LiquidDefiMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_DEFI_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
