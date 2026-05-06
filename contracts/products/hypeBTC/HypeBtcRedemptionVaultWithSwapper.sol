// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./HypeBtcMidasAccessControlRoles.sol";

/**
 * @title HypeBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles hypeBTC redemptions
 * @author RedDuck Software
 */
contract HypeBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    HypeBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HYPE_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
