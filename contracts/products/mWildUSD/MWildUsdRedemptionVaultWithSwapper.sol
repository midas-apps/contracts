// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MWildUsdMidasAccessControlRoles.sol";

/**
 * @title MWildUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles mWildUSD redemptions
 * @author RedDuck Software
 */
contract MWildUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MWildUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_WILD_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
