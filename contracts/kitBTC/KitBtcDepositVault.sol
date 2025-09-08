// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./KitBtcMidasAccessControlRoles.sol";

/**
 * @title KitBtcDepositVault
 * @notice Smart contract that handles kitBTC minting
 * @author RedDuck Software
 */
contract KitBtcDepositVault is DepositVault, KitBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KIT_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
