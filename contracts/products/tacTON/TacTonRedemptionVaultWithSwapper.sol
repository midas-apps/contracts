// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./TacTonMidasAccessControlRoles.sol";

/**
 * @title TacTonRedemptionVaultWithSwapper
 * @notice Smart contract that handles tacTON redemptions
 * @author RedDuck Software
 */
contract TacTonRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    TacTonMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_TON_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
