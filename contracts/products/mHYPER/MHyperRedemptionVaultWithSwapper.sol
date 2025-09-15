// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MHyperMidasAccessControlRoles.sol";

/**
 * @title MHyperRedemptionVaultWithSwapper
 * @notice Smart contract that handles mHYPER redemptions
 * @author RedDuck Software
 */
contract MHyperRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MHyperMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_HYPER_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
