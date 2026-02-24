// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MTuMidasAccessControlRoles.sol";

/**
 * @title MTuRedemptionVaultWithSwapper
 * @notice Smart contract that handles mTU redemptions
 * @author RedDuck Software
 */
contract MTuRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MTuMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_TU_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
