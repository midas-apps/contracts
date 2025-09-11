// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./MXrpMidasAccessControlRoles.sol";

/**
 * @title MXrpRedemptionVaultWithSwapper
 * @notice Smart contract that handles mXRP redemptions
 * @author RedDuck Software
 */
contract MXrpRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MXrpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_XRP_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
