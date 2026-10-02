// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./Re7ETHMidasAccessControlRoles.sol";

/**
 * @title Re7ETHDepositVault
 * @notice Smart contract that handles Re7ETH minting
 * @author RedDuck Software
 */
contract Re7ETHDepositVault is DepositVault, Re7ETHMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RE7_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
