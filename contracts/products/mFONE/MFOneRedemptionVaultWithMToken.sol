// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithMToken.sol";
import "./MFOneMidasAccessControlRoles.sol";

/**
 * @title MFOneRedemptionVaultWithMToken
 * @notice Smart contract that handles mF-ONE redemptions using mToken
 * liquid strategy. Upgrade-compatible replacement for
 * MFOneRedemptionVaultWithSwapper.
 * @author RedDuck Software
 */
contract MFOneRedemptionVaultWithMToken is
    RedemptionVaultWithMToken,
    MFOneMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FONE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
