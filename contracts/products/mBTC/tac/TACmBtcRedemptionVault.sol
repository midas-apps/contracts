// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../RedemptionVault.sol";
import "./TACmBtcMidasAccessControlRoles.sol";

/**
 * @title TACmBtcRedemptionVault
 * @notice Smart contract that handles TACmBTC redemption
 * @author RedDuck Software
 */
contract TACmBtcRedemptionVault is
    RedemptionVault,
    TACmBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_M_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
