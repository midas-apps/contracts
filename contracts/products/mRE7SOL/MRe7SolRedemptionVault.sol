// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVault.sol";
import "./MRe7SolMidasAccessControlRoles.sol";

/**
 * @title MRe7SolRedemptionVault
 * @notice Smart contract that handles mRE7SOL redemptions
 * @author RedDuck Software
 */
contract MRe7SolRedemptionVault is
    RedemptionVault,
    MRe7SolMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7SOL_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
