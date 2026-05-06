// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MEdgeMidasAccessControlRoles.sol";

/**
 * @title MEdgeRedemptionVaultWithSwapper
 * @notice Smart contract that handles mEDGE redemptions
 * @author RedDuck Software
 */
contract MEdgeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MEdgeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
