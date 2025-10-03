// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./ObeatUsdMidasAccessControlRoles.sol";

/**
 * @title ObeatUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles obeatUSD redemptions
 * @author RedDuck Software
 */
contract ObeatUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    ObeatUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return OBEAT_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
