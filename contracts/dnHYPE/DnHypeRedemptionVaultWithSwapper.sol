// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./DnHypeMidasAccessControlRoles.sol";

/**
 * @title DnHypeRedemptionVaultWithSwapper
 * @notice Smart contract that handles dnHYPE redemptions
 * @author RedDuck Software
 */
contract DnHypeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    DnHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_HYPE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
