// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MPortofinoMidasAccessControlRoles.sol";

/**
 * @title MPortofinoRedemptionVaultWithSwapper
 * @notice Smart contract that handles mPortofino redemptions
 * @author RedDuck Software
 */
contract MPortofinoRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MPortofinoMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_PORTOFINO_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
