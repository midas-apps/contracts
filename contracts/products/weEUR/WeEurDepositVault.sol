// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./WeEurMidasAccessControlRoles.sol";

/**
 * @title WeEurDepositVault
 * @notice Smart contract that handles weEUR minting
 * @author RedDuck Software
 */
contract WeEurDepositVault is DepositVault, WeEurMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return WE_EUR_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
