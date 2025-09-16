// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./EUsdMidasAccessControlRoles.sol";
import "../../DepositVault.sol";

/**
 * @title EUsdDepositVault
 * @notice Smart contract that handles eUSD minting
 * @author RedDuck Software
 */
contract EUsdDepositVault is DepositVault, EUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return E_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    function greenlistedRole() public pure override returns (bytes32) {
        return E_USD_GREENLISTED_ROLE;
    }
}
