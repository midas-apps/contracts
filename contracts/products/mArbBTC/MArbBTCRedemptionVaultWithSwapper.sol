// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MArbBTCMidasAccessControlRoles.sol";

/**
 * @title MArbBTCRedemptionVaultWithSwapper
 * @notice Smart contract that handles mArbBTC redemptions
 * @author RedDuck Software
 */
contract MArbBTCRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MArbBTCMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ARB_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_ARB_GREENLISTED_ROLE;
    }
}
