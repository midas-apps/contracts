// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./KitBtcMidasAccessControlRoles.sol";

/**
 * @title KitBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles kitBTC redemptions
 * @author RedDuck Software
 */
contract KitBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    KitBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KIT_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
