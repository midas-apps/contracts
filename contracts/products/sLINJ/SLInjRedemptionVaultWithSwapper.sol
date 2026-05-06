// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./SLInjMidasAccessControlRoles.sol";

/**
 * @title SLInjRedemptionVaultWithSwapper
 * @notice Smart contract that handles sLINJ redemptions
 * @author RedDuck Software
 */
contract SLInjRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    SLInjMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return SL_INJ_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
