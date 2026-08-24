// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./Re7YIELDMidasAccessControlRoles.sol";

/**
 * @title Re7YIELDRedemptionVaultWithSwapper
 * @notice Smart contract that handles Re7YIELD redemptions
 * @author RedDuck Software
 */
contract Re7YIELDRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    Re7YIELDMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RE7_YIELD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
