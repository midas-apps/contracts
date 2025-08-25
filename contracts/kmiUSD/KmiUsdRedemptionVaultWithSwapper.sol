// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./KmiUsdMidasAccessControlRoles.sol";

/**
 * @title KmiUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles kmiUSD redemptions
 * @author RedDuck Software
 */
contract KmiUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    KmiUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KMI_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
