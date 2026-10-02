// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MoriniGoldYieldMidasAccessControlRoles.sol";

/**
 * @title MoriniGoldYieldRedemptionVaultWithSwapper
 * @notice Smart contract that handles moriniGoldYield redemptions
 * @author RedDuck Software
 */
contract MoriniGoldYieldRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MoriniGoldYieldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return MORINI_GOLD_YIELD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
