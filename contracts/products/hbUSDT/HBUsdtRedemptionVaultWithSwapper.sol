// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./HBUsdtMidasAccessControlRoles.sol";

/**
 * @title HBUsdtRedemptionVaultWithSwapper
 * @notice Smart contract that handles hbUSDT redemptions
 * @author RedDuck Software
 */
contract HBUsdtRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    HBUsdtMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HB_USDT_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
