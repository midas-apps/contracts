// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../DepositVault.sol";
import "./TACmBtcMidasAccessControlRoles.sol";

/**
 * @title TACmBtcDepositVault
 * @notice Smart contract that handles TACmBTC minting
 * @author RedDuck Software
 */
contract TACmBtcDepositVault is DepositVault, TACmBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_M_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
