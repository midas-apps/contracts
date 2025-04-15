// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVault.sol";
import "./TACmMevMidasAccessControlRoles.sol";

/**
 * @title TACmMevRedemptionVault
 * @notice Smart contract that handles TACmMEV redemption
 * @author RedDuck Software
 */
contract TACmMevRedemptionVault is
    RedemptionVault,
    TACmMevMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TAC_M_MEV_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
