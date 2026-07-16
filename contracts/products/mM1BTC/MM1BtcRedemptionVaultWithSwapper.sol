// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MM1BtcMidasAccessControlRoles.sol";

/**
 * @title MM1BtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles mM1BTC redemptions
 * @author RedDuck Software
 */
contract MM1BtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MM1BtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_M1_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
