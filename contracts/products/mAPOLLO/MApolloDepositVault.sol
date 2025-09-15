// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MApolloMidasAccessControlRoles.sol";

/**
 * @title MApolloDepositVault
 * @notice Smart contract that handles mAPOLLO minting
 * @author RedDuck Software
 */
contract MApolloDepositVault is DepositVault, MApolloMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_APOLLO_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
