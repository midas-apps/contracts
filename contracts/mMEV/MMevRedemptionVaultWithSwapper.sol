// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./MMevMidasAccessControlRoles.sol";

/**
 * @title MMevRedemptionVaultWithSwapper
 * @notice Smart contract that handles mMEV redemptions
 * @author RedDuck Software
 */
contract MMevRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MMevMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_MEV_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
