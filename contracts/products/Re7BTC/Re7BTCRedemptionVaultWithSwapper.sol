// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./Re7BTCMidasAccessControlRoles.sol";

/**
 * @title Re7BTCRedemptionVaultWithSwapper
 * @notice Smart contract that handles Re7BTC redemptions
 * @author RedDuck Software
 */
contract Re7BTCRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    Re7BTCMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RE7_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
