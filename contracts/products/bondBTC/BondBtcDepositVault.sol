// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./BondBtcMidasAccessControlRoles.sol";

/**
 * @title BondBtcDepositVault
 * @notice Smart contract that handles bondBTC minting
 * @author RedDuck Software
 */
contract BondBtcDepositVault is DepositVault, BondBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return BOND_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
