// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MAlphaMidasAccessControlRoles.sol";

/**
 * @title MAlphaRedemptionVaultWithSwapper
 * @notice Smart contract that handles mALPHA redemptions
 * @author RedDuck Software
 */
contract MAlphaRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MAlphaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ALPHA_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
