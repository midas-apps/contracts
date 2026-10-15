// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./RadUsdMidasAccessControlRoles.sol";

/**
 * @title RadUsdDepositVault
 * @notice Smart contract that handles radUSD minting
 * @author RedDuck Software
 */
contract RadUsdDepositVault is DepositVault, RadUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return RAD_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return RADIAL_GREENLISTED_ROLE;
    }
}
