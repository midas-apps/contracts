// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./HBXautMidasAccessControlRoles.sol";

/**
 * @title HBXautRedemptionVaultWithSwapper
 * @notice Smart contract that handles hbXAUt redemptions
 * @author RedDuck Software
 */
contract HBXautRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    HBXautMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HB_XAUT_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
