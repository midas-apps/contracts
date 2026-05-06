// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./WVLPMidasAccessControlRoles.sol";

/**
 * @title WVLPRedemptionVaultWithSwapper
 * @notice Smart contract that handles wVLP redemptions
 * @author RedDuck Software
 */
contract WVLPRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    WVLPMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return W_VLP_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
