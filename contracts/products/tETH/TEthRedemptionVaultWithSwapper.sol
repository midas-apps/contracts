// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./TEthMidasAccessControlRoles.sol";

/**
 * @title TEthRedemptionVaultWithSwapper
 * @notice Smart contract that handles tETH redemptions
 * @author RedDuck Software
 */
contract TEthRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    TEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return T_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
