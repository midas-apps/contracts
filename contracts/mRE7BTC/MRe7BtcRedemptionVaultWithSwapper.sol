// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./MRe7BtcMidasAccessControlRoles.sol";

/**
 * @title MRe7BtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles mRE7BTC redemptions
 * @author RedDuck Software
 */
contract MRe7BtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MRe7BtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
