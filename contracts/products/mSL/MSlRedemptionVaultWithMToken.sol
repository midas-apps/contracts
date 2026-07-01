// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithMToken.sol";
import "./MSlMidasAccessControlRoles.sol";

/**
 * @title MSlRedemptionVaultWithMToken
 * @notice Smart contract that handles mSL redemptions using mToken
 * liquid strategy. Upgrade-compatible replacement for
 * MSlRedemptionVaultWithSwapper.
 * @author RedDuck Software
 */
contract MSlRedemptionVaultWithMToken is
    RedemptionVaultWithMToken,
    MSlMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SL_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
