// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./LiquidReserveMidasAccessControlRoles.sol";

/**
 * @title LiquidReserveRedemptionVaultWithSwapper
 * @notice Smart contract that handles liquidRESERVE redemptions
 * @author RedDuck Software
 */
contract LiquidReserveRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    LiquidReserveMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_RESERVE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
