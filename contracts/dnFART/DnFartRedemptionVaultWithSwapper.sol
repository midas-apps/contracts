// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./DnFartMidasAccessControlRoles.sol";

/**
 * @title DnFartRedemptionVaultWithSwapper
 * @notice Smart contract that handles dnFART redemptions
 * @author RedDuck Software
 */
contract DnFartRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    DnFartMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_FART_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
