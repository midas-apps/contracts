// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVault.sol";
import "./MBtcMidasAccessControlRoles.sol";

/**
 * @title MBtcRedemptionVault
 * @notice Smart contract that handles mBTC redemption
 * @author RedDuck Software
 */
contract MBtcRedemptionVault is RedemptionVault, MBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
