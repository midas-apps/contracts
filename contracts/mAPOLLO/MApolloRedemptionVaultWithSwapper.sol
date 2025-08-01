// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./MApolloMidasAccessControlRoles.sol";

/**
 * @title MApolloRedemptionVaultWithSwapper
 * @notice Smart contract that handles mAPOLLO redemptions
 * @author RedDuck Software
 */
contract MApolloRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MApolloMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_APOLLO_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
