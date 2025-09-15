// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MSlMidasAccessControlRoles.sol";

/**
 * @title MSlRedemptionVaultWithSwapper
 * @notice Smart contract that handles mSL redemptions
 * @author RedDuck Software
 */
contract MSlRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MSlMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SL_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
