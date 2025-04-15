// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./TACmEdgeMidasAccessControlRoles.sol";

/**
 * @title TACmEdgeDepositVault
 * @notice Smart contract that handles TACmEdge minting
 * @author RedDuck Software
 */
contract TACmEdgeDepositVault is DepositVault, TACmEdgeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
