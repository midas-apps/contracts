// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithMorpho.sol";
import "./MGloEuroMidasAccessControlRoles.sol";

/**
 * @title MGloEuroRedemptionVaultWithMorpho
 * @notice Smart contract that handles mGLOeuro redemptions via Morpho Vault
 * @author RedDuck Software
 */
contract MGloEuroRedemptionVaultWithMorpho is
    RedemptionVaultWithMorpho,
    MGloEuroMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_GLO_EURO_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
