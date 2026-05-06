// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MevBtcMidasAccessControlRoles.sol";

/**
 * @title MevBtcDepositVault
 * @notice Smart contract that handles mevBTC minting
 * @author RedDuck Software
 */
contract MevBtcDepositVault is DepositVault, MevBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return MEV_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
