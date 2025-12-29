// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MKRalphaMidasAccessControlRoles.sol";

/**
 * @title MKRalphaRedemptionVaultWithSwapper
 * @notice Smart contract that handles mKRalpha redemptions
 * @author RedDuck Software
 */
contract MKRalphaRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MKRalphaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_KRALPHA_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
