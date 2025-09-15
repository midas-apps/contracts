// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./JivMidasAccessControlRoles.sol";

/**
 * @title JivRedemptionVaultWithSwapper
 * @notice Smart contract that handles JIV redemptions
 * @author RedDuck Software
 */
contract JivRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    JivMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return JIV_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
