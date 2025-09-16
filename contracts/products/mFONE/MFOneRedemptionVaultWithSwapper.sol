// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MFOneMidasAccessControlRoles.sol";

/**
 * @title MFOneRedemptionVaultWithSwapper
 * @notice Smart contract that handles mF-ONE redemptions
 * @author RedDuck Software
 */
contract MFOneRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MFOneMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FONE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
