// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./QHVNUsdMidasAccessControlRoles.sol";

/**
 * @title QHVNUsdDepositVault
 * @notice Smart contract that handles qHVNUSD minting
 * @author RedDuck Software
 */
contract QHVNUsdDepositVault is DepositVault, QHVNUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return Q_HVN_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return Q_HVN_USD_GREENLISTED_ROLE;
    }
}
