// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./DnEthMidasAccessControlRoles.sol";

/**
 * @title DnEthDepositVault
 * @notice Smart contract that handles dnETH minting
 * @author RedDuck Software
 */
contract DnEthDepositVault is DepositVault, DnEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
