// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./HBUsdcMidasAccessControlRoles.sol";

/**
 * @title HBUsdcRedemptionVaultWithSwapper
 * @notice Smart contract that handles hbUSDC redemptions
 * @author RedDuck Software
 */
contract HBUsdcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    HBUsdcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HB_USDC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
