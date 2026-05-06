// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MevBtcMidasAccessControlRoles.sol";

/**
 * @title MevBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles mevBTC redemptions
 * @author RedDuck Software
 */
contract MevBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MevBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return MEV_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
