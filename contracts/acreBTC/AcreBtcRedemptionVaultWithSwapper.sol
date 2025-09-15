// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./AcreBtcMidasAccessControlRoles.sol";

/**
 * @title AcreBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles acreBTC redemptions
 * @author RedDuck Software
 */
contract AcreBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    AcreBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
