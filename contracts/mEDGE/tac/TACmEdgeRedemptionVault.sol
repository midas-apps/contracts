// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVault.sol";
import "./TACmEdgeMidasAccessControlRoles.sol";

/**
 * @title TACmEdgeRedemptionVault
 * @notice Smart contract that handles TACmEDGE redemption
 * @author RedDuck Software
 */
contract TACmEdgeRedemptionVault is
    RedemptionVault,
    TACmEdgeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_M_EDGE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
