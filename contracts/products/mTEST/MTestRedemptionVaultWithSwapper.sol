// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../RedemptionVaultWithSwapper.sol";
import "./MTestMidasAccessControlRoles.sol";

/**
 * @title MTestRedemptionVaultWithSwapper
 * @notice Smart contract that handles mTEST redemptions
 * @author RedDuck Software
 */
contract MTestRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MTestMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_TEST_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_TEST_GREENLISTED_ROLE;
    }
}
