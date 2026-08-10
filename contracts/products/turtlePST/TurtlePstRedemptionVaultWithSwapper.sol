// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./TurtlePstMidasAccessControlRoles.sol";

/**
 * @title TurtlePstRedemptionVaultWithSwapper
 * @notice Smart contract that handles turtlePST redemptions
 * @author RedDuck Software
 */
contract TurtlePstRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    TurtlePstMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TURTLE_PST_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
