// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./DnPumpMidasAccessControlRoles.sol";

/**
 * @title DnPumpRedemptionVaultWithSwapper
 * @notice Smart contract that handles dnPUMP redemptions
 * @author RedDuck Software
 */
contract DnPumpRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    DnPumpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_PUMP_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
