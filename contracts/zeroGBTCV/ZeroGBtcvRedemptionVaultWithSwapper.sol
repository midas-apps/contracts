// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./ZeroGBtcvMidasAccessControlRoles.sol";

/**
 * @title ZeroGBtcvRedemptionVaultWithSwapper
 * @notice Smart contract that handles zeroGBTCV redemptions
 * @author RedDuck Software
 */
contract ZeroGBtcvRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    ZeroGBtcvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ZEROG_BTCV_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
