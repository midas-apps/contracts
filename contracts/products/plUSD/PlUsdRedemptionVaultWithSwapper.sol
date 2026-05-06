// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./PlUsdMidasAccessControlRoles.sol";

/**
 * @title PlUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles plUSD redemptions
 * @author RedDuck Software
 */
contract PlUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    PlUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return PL_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
