// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../DepositVault.sol";
import "./BondEthMidasAccessControlRoles.sol";

/**
 * @title BondEthDepositVault
 * @notice Smart contract that handles bondETH minting
 * @author RedDuck Software
 */
contract BondEthDepositVault is DepositVault, BondEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return BOND_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
