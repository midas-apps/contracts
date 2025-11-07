// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MEvUsdMidasAccessControlRoles.sol";

/**
 * @title MEvUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles mEVUSD redemptions
 * @author RedDuck Software
 */
contract MEvUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MEvUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_EV_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
