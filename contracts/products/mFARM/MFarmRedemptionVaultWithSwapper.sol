// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MFarmMidasAccessControlRoles.sol";

/**
 * @title MFarmRedemptionVaultWithSwapper
 * @notice Smart contract that handles mFARM redemptions
 * @author RedDuck Software
 */
contract MFarmRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MFarmMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FARM_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
