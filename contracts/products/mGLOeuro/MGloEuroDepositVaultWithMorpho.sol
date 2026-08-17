// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVaultWithMorpho.sol";
import "./MGloEuroMidasAccessControlRoles.sol";

/**
 * @title MGloEuroDepositVaultWithMorpho
 * @notice Smart contract that handles mGLOeuro minting with Morpho auto-invest
 * @author RedDuck Software
 */
contract MGloEuroDepositVaultWithMorpho is
    DepositVaultWithMorpho,
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
        return M_GLO_EURO_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
