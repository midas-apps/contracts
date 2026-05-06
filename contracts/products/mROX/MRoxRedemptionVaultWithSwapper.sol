// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MRoxMidasAccessControlRoles.sol";

/**
 * @title MRoxRedemptionVaultWithSwapper
 * @notice Smart contract that handles mROX redemptions
 * @author RedDuck Software
 */
contract MRoxRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MRoxMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ROX_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
