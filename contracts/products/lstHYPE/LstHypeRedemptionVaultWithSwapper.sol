// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./LstHypeMidasAccessControlRoles.sol";

/**
 * @title LstHypeRedemptionVaultWithSwapper
 * @notice Smart contract that handles lstHYPE redemptions
 * @author RedDuck Software
 */
contract LstHypeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    LstHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LST_HYPE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
