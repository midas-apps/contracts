// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./WeEurMidasAccessControlRoles.sol";

/**
 * @title WeEurRedemptionVaultWithSwapper
 * @notice Smart contract that handles weEUR redemptions
 * @author RedDuck Software
 */
contract WeEurRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    WeEurMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return WE_EUR_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
