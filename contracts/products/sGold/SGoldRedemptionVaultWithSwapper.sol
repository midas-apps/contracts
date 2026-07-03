// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./SGoldMidasAccessControlRoles.sol";

/**
 * @title SGoldRedemptionVaultWithSwapper
 * @notice Smart contract that handles sGold redemptions
 * @author RedDuck Software
 */
contract SGoldRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    SGoldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return S_GOLD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
