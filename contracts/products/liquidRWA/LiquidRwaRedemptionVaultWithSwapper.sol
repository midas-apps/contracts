// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./LiquidRwaMidasAccessControlRoles.sol";

/**
 * @title LiquidRwaRedemptionVaultWithSwapper
 * @notice Smart contract that handles liquidRWA redemptions
 * @author RedDuck Software
 */
contract LiquidRwaRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    LiquidRwaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_RWA_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
