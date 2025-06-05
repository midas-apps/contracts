// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./TBtcMidasAccessControlRoles.sol";

/**
 * @title TBtcDepositVault
 * @notice Smart contract that handles tBTC minting
 * @author RedDuck Software
 */
contract TBtcDepositVault is DepositVault, TBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return T_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
