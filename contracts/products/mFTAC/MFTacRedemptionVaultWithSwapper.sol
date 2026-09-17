// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MFTacMidasAccessControlRoles.sol";

/**
 * @title MFTacRedemptionVaultWithSwapper
 * @notice Smart contract that handles mFTAC redemptions
 * @author RedDuck Software
 */
contract MFTacRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MFTacMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FTAC_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
