// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MEdgeMidasAccessControlRoles.sol";

/**
 * @title MEdgeDepositVault
 * @notice Smart contract that handles mEDGE minting
 * @author RedDuck Software
 */
contract MEdgeDepositVault is DepositVault, MEdgeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_EDGE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
