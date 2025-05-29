// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./TEthMidasAccessControlRoles.sol";

/**
 * @title TEthDepositVault
 * @notice Smart contract that handles tETH minting
 * @author RedDuck Software
 */
contract TEthDepositVault is DepositVault, TEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return T_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
