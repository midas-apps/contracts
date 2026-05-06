// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MSyrupUsdpMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdpRedemptionVaultWithSwapper
 * @notice Smart contract that handles msyrupUSDp redemptions
 * @author RedDuck Software
 */
contract MSyrupUsdpRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MSyrupUsdpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_SYRUP_USDP_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
