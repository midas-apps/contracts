// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./Re7ETHMidasAccessControlRoles.sol";

/**
 * @title Re7ETHRedemptionVaultWithSwapper
 * @notice Smart contract that handles Re7ETH redemptions
 * @author RedDuck Software
 */
contract Re7ETHRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    Re7ETHMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RE7_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
