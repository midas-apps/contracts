// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MRe7BtcMidasAccessControlRoles.sol";

/**
 * @title MRe7BtcDepositVault
 * @notice Smart contract that handles mRE7BTC minting
 * @author RedDuck Software
 */
contract MRe7BtcDepositVault is DepositVault, MRe7BtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
