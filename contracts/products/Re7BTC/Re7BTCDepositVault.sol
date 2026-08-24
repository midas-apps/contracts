// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./Re7BTCMidasAccessControlRoles.sol";

/**
 * @title Re7BTCDepositVault
 * @notice Smart contract that handles Re7BTC minting
 * @author RedDuck Software
 */
contract Re7BTCDepositVault is DepositVault, Re7BTCMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RE7_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
