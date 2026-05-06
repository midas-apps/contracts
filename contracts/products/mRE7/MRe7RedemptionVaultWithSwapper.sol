// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MRe7MidasAccessControlRoles.sol";

/**
 * @title MRe7RedemptionVaultWithSwapper
 * @notice Smart contract that handles mRE7 redemptions
 * @author RedDuck Software
 */
contract MRe7RedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MRe7MidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
