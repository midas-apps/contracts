// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./AcreBtcMidasAccessControlRoles.sol";

/**
 * @title AcreBtcDepositVault
 * @notice Smart contract that handles acreBTC minting
 * @author RedDuck Software
 */
contract AcreBtcDepositVault is DepositVault, AcreBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
