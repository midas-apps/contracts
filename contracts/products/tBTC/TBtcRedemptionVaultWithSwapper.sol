// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./TBtcMidasAccessControlRoles.sol";

/**
 * @title TBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles tBTC redemptions
 * @author RedDuck Software
 */
contract TBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    TBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return T_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
