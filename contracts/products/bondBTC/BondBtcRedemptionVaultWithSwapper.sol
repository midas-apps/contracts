// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./BondBtcMidasAccessControlRoles.sol";

/**
 * @title BondBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles bondBTC redemptions
 * @author RedDuck Software
 */
contract BondBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    BondBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return BOND_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
