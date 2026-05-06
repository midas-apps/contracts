// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./EUsdMidasAccessControlRoles.sol";
import "../../RedemptionVaultWithBUIDL.sol";

/**
 * @title EUsdRedemptionVaultWithBUIDL
 * @notice Smart contract that handles eUSD redeeming
 * @author RedDuck Software
 */
contract EUsdRedemptionVaultWithBUIDL is
    RedemptionVaultWIthBUIDL,
    EUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return E_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    function greenlistedRole() public pure override returns (bytes32) {
        return E_USD_GREENLISTED_ROLE;
    }
}
