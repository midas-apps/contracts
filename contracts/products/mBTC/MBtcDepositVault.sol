// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MBtcMidasAccessControlRoles.sol";

/**
 * @title MBtcDepositVault
 * @notice Smart contract that handles mBTC minting
 * @author RedDuck Software
 */
contract MBtcDepositVault is DepositVault, MBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
