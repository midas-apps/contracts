// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MHyperBtcMidasAccessControlRoles.sol";

/**
 * @title MHyperBtcRedemptionVaultWithSwapper
 * @notice Smart contract that handles mHyperBTC redemptions
 * @author RedDuck Software
 */
contract MHyperBtcRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MHyperBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_HYPER_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
