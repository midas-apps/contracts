// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./KitHypeMidasAccessControlRoles.sol";

/**
 * @title KitHypeRedemptionVaultWithSwapper
 * @notice Smart contract that handles kitHYPE redemptions
 * @author RedDuck Software
 */
contract KitHypeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    KitHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KIT_HYPE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
