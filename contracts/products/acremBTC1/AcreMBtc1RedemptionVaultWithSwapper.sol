// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./AcreMBtc1MidasAccessControlRoles.sol";

/**
 * @title AcreMBtc1RedemptionVaultWithSwapper
 * @notice Smart contract that handles acremBTC1 redemptions
 * @author RedDuck Software
 */
contract AcreMBtc1RedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    AcreMBtc1MidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ACRE_BTC_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
