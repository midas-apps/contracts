// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./DnTestMidasAccessControlRoles.sol";

/**
 * @title DnTestRedemptionVaultWithSwapper
 * @notice Smart contract that handles dnTEST redemptions
 * @author RedDuck Software
 */
contract DnTestRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    DnTestMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_TEST_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
