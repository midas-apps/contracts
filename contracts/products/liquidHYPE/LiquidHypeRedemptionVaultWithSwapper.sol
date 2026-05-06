// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./LiquidHypeMidasAccessControlRoles.sol";

/**
 * @title LiquidHypeRedemptionVaultWithSwapper
 * @notice Smart contract that handles liquidHYPE redemptions
 * @author RedDuck Software
 */
contract LiquidHypeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    LiquidHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_HYPE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
